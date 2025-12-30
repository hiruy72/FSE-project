// Demo data for the platform
export const createDemoUsers = () => {
  const demoUsers = [
    {
      uid: 'mentor-1',
      email: 'sarah.chen@aau.edu.et',
      firstName: 'Sarah',
      lastName: 'Chen',
      role: 'mentor',
      approved: true,
      profile: {
        bio: 'Computer Science lecturer with 5+ years of experience. Passionate about helping students learn React, Node.js, and modern web development practices.',
        skills: ['React', 'Node.js', 'JavaScript', 'TypeScript', 'MongoDB'],
        courses: ['course-1', 'course-2'],
        availability: ['Monday', 'Wednesday', 'Friday'],
        averageRating: 4.9,
        totalRatings: 45
      },
      createdAt: new Date('2024-01-15').toISOString()
    },
    {
      uid: 'mentor-2',
      email: 'alex.rodriguez@aau.edu.et',
      firstName: 'Alex',
      lastName: 'Rodriguez',
      role: 'mentor',
      approved: true,
      profile: {
        bio: 'Data Science professor and machine learning researcher. I help students understand Python, data analysis, and ML algorithms through practical projects.',
        skills: ['Python', 'Data Science', 'Machine Learning', 'Pandas', 'Scikit-learn'],
        courses: ['course-2'],
        availability: ['Tuesday', 'Thursday', 'Saturday'],
        averageRating: 4.8,
        totalRatings: 32
      },
      createdAt: new Date('2024-02-01').toISOString()
    },
    {
      uid: 'mentor-3',
      email: 'jessica.kim@aau.edu.et',
      firstName: 'Jessica',
      lastName: 'Kim',
      role: 'mentor',
      approved: true,
      profile: {
        bio: 'Design lecturer with a passion for creating user-centered designs. I teach design thinking, prototyping, and modern design tools.',
        skills: ['UI Design', 'UX Design', 'Figma', 'Prototyping', 'User Research'],
        courses: ['course-3'],
        availability: ['Monday', 'Tuesday', 'Thursday'],
        averageRating: 4.9,
        totalRatings: 28
      },
      createdAt: new Date('2024-01-20').toISOString()
    },
    {
      uid: 'mentor-4',
      email: 'david.park@aau.edu.et',
      firstName: 'David',
      lastName: 'Park',
      role: 'mentor',
      approved: true,
      profile: {
        bio: 'Cybersecurity specialist and ethical hacker. I help students understand security concepts, network protocols, and secure coding practices.',
        skills: ['Cybersecurity', 'Ethical Hacking', 'Network Security', 'Cryptography', 'Penetration Testing'],
        courses: ['course-4'],
        availability: ['Wednesday', 'Friday', 'Sunday'],
        averageRating: 4.7,
        totalRatings: 19
      },
      createdAt: new Date('2024-02-10').toISOString()
    },
    // Add university student account
    {
      uid: 'demo-student-aau',
      email: 'hiruy.ugr-1838-16@aau.edu.et',
      firstName: 'Hiruy',
      lastName: 'Tesfaye',
      role: 'mentee',
      approved: true,
      profile: {
        bio: 'Computer Science student at Addis Ababa University, passionate about web development and software engineering.',
        skills: ['JavaScript', 'React', 'Python', 'HTML', 'CSS'],
        courses: ['course-1', 'course-2'],
        availability: [],
        averageRating: 0,
        totalRatings: 0
      },
      createdAt: new Date('2024-03-01').toISOString()
    },
    // Add a demo admin account
    {
      uid: 'demo-admin-1',
      email: 'admin@aau.edu.et',
      firstName: 'Demo',
      lastName: 'Admin',
      role: 'admin',
      approved: true,
      profile: {
        bio: 'Platform administrator managing the peer mentorship system.',
        skills: ['Administration', 'User Management'],
        courses: [],
        availability: [],
        averageRating: 0,
        totalRatings: 0
      },
      createdAt: new Date('2024-01-01').toISOString()
    }
  ];

  // Always update localStorage with fresh demo data
  localStorage.setItem('demoUsers', JSON.stringify(demoUsers));

  return demoUsers;
};

export const getDemoMentors = () => {
  const users = JSON.parse(localStorage.getItem('demoUsers') || '[]');
  return users.filter(user => user.role === 'mentor' && user.approved);
};

export const getDemoCourses = () => {
  return [
    {
      id: 'course-1',
      name: 'React & Next.js Mastery',
      department: 'Computer Science',
      description: 'Learn modern React development with Next.js framework',
      tags: ['React', 'Next.js', 'JavaScript', 'Frontend']
    },
    {
      id: 'course-2',
      name: 'Python for Data Science',
      department: 'Data Science',
      description: 'Master Python programming for data analysis and machine learning',
      tags: ['Python', 'Data Analysis', 'Machine Learning', 'Pandas']
    },
    {
      id: 'course-3',
      name: 'UI/UX Design Fundamentals',
      department: 'Design',
      description: 'Learn user interface and user experience design principles',
      tags: ['UI Design', 'UX Design', 'Figma', 'Prototyping']
    },
    {
      id: 'course-4',
      name: 'Cybersecurity Essentials',
      department: 'Computer Science',
      description: 'Introduction to cybersecurity concepts and practices',
      tags: ['Security', 'Networking', 'Ethical Hacking', 'Cryptography']
    }
  ];
};