const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

const initializeDatabase = async () => {
  try {
    console.log('🔧 Initializing database schema...');

    // Read schema file
    const schemaPath = path.join(__dirname, '../config/schema-simple.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    // Execute each statement
    for (const statement of statements) {
      try {
        await query(statement);
      } catch (error) {
        // Ignore errors for statements that might already exist
        if (!error.message.includes('already exists')) {
          console.error('Schema error:', error.message);
        }
      }
    }

    console.log('✅ Database schema initialized successfully');

    // Seed initial data
    await seedInitialData();

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

const seedInitialData = async () => {
  try {
    console.log('🌱 Seeding initial data...');

    // Check if courses already exist
    const existingCourses = await query('SELECT COUNT(*) as count FROM courses');
    
    if (parseInt(existingCourses[0].count) > 0) {
      console.log('📚 Courses already exist, skipping seed');
      return;
    }

    // Sample courses
    const courses = [
      {
        name: 'React & Next.js Mastery',
        department: 'Computer Science',
        description: 'Learn modern React development with Next.js framework',
        tags: ['React', 'Next.js', 'JavaScript', 'Frontend']
      },
      {
        name: 'Python for Data Science',
        department: 'Data Science',
        description: 'Master Python programming for data analysis and machine learning',
        tags: ['Python', 'Data Analysis', 'Machine Learning', 'Pandas']
      },
      {
        name: 'UI/UX Design Fundamentals',
        department: 'Design',
        description: 'Learn user interface and user experience design principles',
        tags: ['UI Design', 'UX Design', 'Figma', 'Prototyping']
      },
      {
        name: 'Cybersecurity Essentials',
        department: 'Computer Science',
        description: 'Introduction to cybersecurity concepts and practices',
        tags: ['Security', 'Networking', 'Ethical Hacking', 'Cryptography']
      },
      {
        name: 'Database Systems',
        department: 'Computer Science',
        description: 'Relational databases, SQL, and database design principles',
        tags: ['SQL', 'PostgreSQL', 'Database Design', 'Normalization']
      },
      {
        name: 'Mobile App Development',
        department: 'Computer Science',
        description: 'Build mobile applications for iOS and Android',
        tags: ['React Native', 'Flutter', 'Mobile', 'Cross-platform']
      }
    ];

    // Insert courses
    for (const course of courses) {
      await query(
        `INSERT INTO courses (name, department, description, tags)
         VALUES ($1, $2, $3, $4)`,
        [course.name, course.department, course.description, course.tags]
      );
    }

    console.log('✅ Initial data seeded successfully');

  } catch (error) {
    console.error('❌ Data seeding failed:', error);
    throw error;
  }
};

module.exports = {
  initializeDatabase,
  seedInitialData
};