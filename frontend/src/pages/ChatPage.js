import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContextNew';
import { chatAPI, sessionAPI } from '../services/api';
import socketService from '../services/socket';
import RatingModal from '../components/RatingModal';
import { 
  Send, 
  Phone, 
  Video, 
  MoreVertical,
  ArrowLeft,
  Clock,
  User,
  CheckCircle,
  Paperclip,
  Image,
  File,
  Download,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

const ChatPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { userData, getIdToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [session, setSession] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(null); // in minutes
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (sessionId) {
      initializeChat();
    }
    
    return () => {
      socketService.leaveSession(sessionId);
      socketService.offMessage(handleNewMessage);
      socketService.offTyping(handleTyping);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Timer effect for session duration
  useEffect(() => {
    if (sessionDuration && sessionStartTime) {
      timerIntervalRef.current = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now - sessionStartTime) / 1000 / 60); // minutes
        const remaining = sessionDuration - elapsed;
        
        setTimeRemaining(remaining);
        
        // Auto-end session when time expires
        if (remaining <= 0) {
          clearInterval(timerIntervalRef.current);
          handleSessionTimeExpired();
        }
      }, 1000);
      
      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    }
  }, [sessionDuration, sessionStartTime]);

  const initializeChat = async () => {
    try {
      const token = await getIdToken();
      
      // Fetch session details - try active sessions first, then completed sessions
      let currentSession = null;
      
      try {
        const activeSessionsResponse = await sessionAPI.getActiveSessions(token);
        currentSession = activeSessionsResponse.data.find(s => s.id === sessionId);
      } catch (error) {
        console.log('No active sessions found, checking completed sessions...');
      }
      
      // If not found in active sessions, check completed sessions
      if (!currentSession) {
        try {
          const completedSessionsResponse = await sessionAPI.getSessionLogs({}, token);
          currentSession = completedSessionsResponse.data.find(s => s.id === sessionId);
        } catch (error) {
          console.log('Error fetching completed sessions:', error);
        }
      }
      
      if (currentSession) {
        console.log('Session found:', currentSession);
        setSession(currentSession);
        if (currentSession.startedAt) {
          setSessionStartTime(new Date(currentSession.startedAt));
        }
        
        // Check if session has a duration set
        if (currentSession.duration) {
          setSessionDuration(currentSession.duration);
        }
      } else {
        console.error('Session not found:', sessionId);
        toast.error('Session not found');
        navigate('/dashboard');
        return;
      }
      
      // Fetch messages
      const messagesResponse = await chatAPI.getMessages(sessionId, {}, token);
      setMessages(messagesResponse.data);

      // Connect to socket and join session room only for active sessions
      if (currentSession.status === 'active') {
        socketService.connect();
        socketService.joinSession(sessionId);
        
        // Set up socket listeners
        socketService.onMessage(handleNewMessage);
        socketService.onTyping(handleTyping);
        socketService.onStopTyping(handleStopTyping);
      }

    } catch (error) {
      console.error('Error initializing chat:', error);
      toast.error('Failed to load chat');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleNewMessage = (message) => {
    setMessages(prev => {
      // Check if message already exists to prevent duplicates
      const messageExists = prev.some(msg => msg.id === message.id);
      if (messageExists) {
        return prev;
      }
      return [...prev, message];
    });
  };

  const handleTyping = (data) => {
    if (data.userId !== userData?.uid) {
      setTyping(true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to hide typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 3000);
    }
  };

  const handleStopTyping = (data) => {
    if (data.userId !== userData?.uid) {
      setTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const token = await getIdToken();
      
      // Send message via API
      await chatAPI.sendMessage({
        sessionId,
        text: messageText
      }, token);

      // Message will be added via socket listener
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setNewMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator
    socketService.sendTyping(sessionId, userData?.uid);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to send stop typing
    typingTimeoutRef.current = setTimeout(() => {
      socketService.sendStopTyping(sessionId, userData?.uid);
    }, 1000);
  };

  const handleSessionTimeExpired = async () => {
    toast.error('Session time has expired');
    await endSession();
  };

  const endSession = async () => {
    try {
      const token = await getIdToken();
      await sessionAPI.endSession(sessionId, {
        summary: 'Session completed successfully'
      }, token);
      
      // For mentees, rating is mandatory - show modal and prevent navigation
      if (userData?.role === 'mentee') {
        toast.success('Session ended. Please rate your experience.');
        setShowRatingModal(true);
      } else {
        toast.success('Session ended successfully');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error ending session:', error);
      toast.error('Failed to end session');
    }
  };

  const handleRatingSubmitted = (rating) => {
    // Rating submitted successfully, navigate to dashboard
    navigate('/dashboard');
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
      setShowFilePreview(true);
    }
  };

  const handleFileUpload = async (fileToUpload, messageText = '') => {
    if (!fileToUpload) return;

    setUploading(true);
    
    try {
      const token = await getIdToken();
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('sessionId', sessionId);
      if (messageText) {
        formData.append('text', messageText);
      }

      await chatAPI.uploadFile(formData, token);
      
      // Clear file selection
      setSelectedFile(null);
      setShowFilePreview(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSendWithFile = async () => {
    if (selectedFile) {
      await handleFileUpload(selectedFile, newMessage);
      setNewMessage('');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  const isImageFile = (fileType) => {
    return fileType?.startsWith('image/');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-dark-900">
      {/* Chat Header */}
      <div className="bg-dark-800 border-b border-dark-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-dark-400 hover:text-white transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-white">
                  {userData?.role === 'mentor' ? 'Student' : 'Mentor'}
                </h2>
                <div className="flex items-center space-x-2">
                  {session?.status === 'completed' ? (
                    <>
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      <span className="text-sm text-dark-400">
                        Completed {session.endedAt ? new Date(session.endedAt).toLocaleDateString() : ''}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-dark-400">Online</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {session?.status !== 'completed' && (
              <>
                <button className="p-2 text-dark-400 hover:text-white transition-colors duration-200">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 text-dark-400 hover:text-white transition-colors duration-200">
                  <Video className="w-5 h-5" />
                </button>
                <button
                  onClick={endSession}
                  className="btn-primary text-sm px-4 py-2"
                >
                  End Session
                </button>
              </>
            )}
            {session?.status === 'completed' && (
              <span className="text-sm text-green-400 font-medium">
                Session Completed
              </span>
            )}
            <button className="p-2 text-dark-400 hover:text-white transition-colors duration-200">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Completed Session Banner */}
        {session?.status === 'completed' && (
          <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-blue-300 font-medium">Session Completed</p>
                <p className="text-blue-400 text-sm">
                  {session.endedAt && `Ended on ${new Date(session.endedAt).toLocaleString()}`}
                  {session.duration && ` • Duration: ${session.duration} minutes`}
                </p>
              </div>
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-dark-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Start the conversation</h3>
            <p className="text-dark-400">Send a message to begin your mentoring session</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId === userData?.uid;
            
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwnMessage
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-700 text-white'
                  }`}
                >
                  {/* File/Image Message */}
                  {message.messageType === 'image' && message.fileUrl && (
                    <div className="mb-2">
                      <img 
                        src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${message.fileUrl}`}
                        alt={message.fileName || 'Shared image'}
                        className="max-w-full h-auto rounded cursor-pointer"
                        onClick={() => window.open(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${message.fileUrl}`, '_blank')}
                      />
                      {message.fileName && (
                        <p className="text-xs mt-1 opacity-75">{message.fileName}</p>
                      )}
                    </div>
                  )}
                  
                  {message.messageType === 'file' && message.fileUrl && (
                    <div className="mb-2">
                      <div className={`flex items-center space-x-2 p-2 rounded border ${
                        isOwnMessage ? 'border-primary-400' : 'border-dark-600'
                      }`}>
                        {getFileIcon(message.fileType)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{message.fileName}</p>
                          <p className="text-xs opacity-75">{formatFileSize(message.fileSize)}</p>
                        </div>
                        <a
                          href={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${message.fileUrl}`}
                          download={message.fileName}
                          className="p-1 hover:bg-black/20 rounded"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {/* Text Message */}
                  {message.text && message.text.trim() && (
                    <p className="text-sm">{message.text}</p>
                  )}
                  
                  <p
                    className={`text-xs mt-1 ${
                      isOwnMessage ? 'text-primary-200' : 'text-dark-400'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {/* Typing Indicator */}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-dark-700 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-dark-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      {session?.status !== 'completed' ? (
        <div className="bg-dark-800 border-t border-dark-700 p-4">
          {/* File Preview */}
          {showFilePreview && selectedFile && (
            <div className="mb-4 p-3 bg-dark-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-white">File Preview</h4>
                <button
                  onClick={() => {
                    setShowFilePreview(false);
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="text-dark-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex items-center space-x-3">
                {isImageFile(selectedFile.type) ? (
                  <div className="w-12 h-12 bg-dark-600 rounded flex items-center justify-center">
                    <Image className="w-6 h-6 text-dark-400" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-dark-600 rounded flex items-center justify-center">
                    <File className="w-6 h-6 text-dark-400" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
                  <p className="text-xs text-dark-400">{formatFileSize(selectedFile.size)}</p>
                </div>
                
                <button
                  onClick={handleSendWithFile}
                  disabled={uploading}
                  className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                >
                  {uploading ? (
                    <div className="loading-spinner w-4 h-4"></div>
                  ) : (
                    'Send File'
                  )}
                </button>
              </div>
              
              {/* Optional message with file */}
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Add a message (optional)..."
                className="w-full mt-3 input-field text-sm"
              />
            </div>
          )}
          
          <form onSubmit={sendMessage} className="flex space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-dark-400 hover:text-white transition-colors duration-200"
              disabled={uploading}
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            <input
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="flex-1 input-field"
              disabled={sending || uploading}
            />
            
            <button
              type="submit"
              disabled={!newMessage.trim() || sending || uploading}
              className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {sending ? (
                <div className="loading-spinner w-4 h-4"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-dark-800 border-t border-dark-700 p-4">
          <div className="text-center text-dark-400">
            <p className="text-sm">This session has been completed. You can review the conversation above.</p>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => {
          setShowRatingModal(false);
          navigate('/dashboard');
        }}
        session={{ id: sessionId, mentorId: session?.mentorId }}
        onRatingSubmitted={handleRatingSubmitted}
        mandatory={userData?.role === 'mentee'}
      />
    </div>
  );
};

export default ChatPage;