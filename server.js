const port = process.env.PORT || 3000;

const academicDashboard = {
  student: {
    id: 'BED/2024/0187',
    fullName: 'Amina Wanjiku',
    initials: 'AW',
    programme: 'Bachelor of Education Science',
    courseCombination: 'Chemistry and Mathematics',
    yearOfStudy: 2,
    semester: 1,
    progress: 72,
    enrolledUnits: 6
  },
  materials: [
    { id: 1, title: 'Introduction to Educational Psychology', unit: 'EDU 220', type: 'PDF', added: 'Added today' },
    { id: 2, title: 'Organic Chemistry: Revision Notes', unit: 'CHE 214', type: 'PDF', added: 'Added yesterday' },
    { id: 3, title: 'Teaching Methods Assignment Brief', unit: 'EDU 216', type: 'DOCX', added: 'Added 2 days ago' }
  ],
  notifications: [
    { id: 1, icon: '📣', title: 'CAT 1 timetable is out', message: 'Please check your unit schedule and venues.', date: '2h ago', read: false },
    { id: 2, icon: '📚', title: 'New materials uploaded', message: 'Three resources were added to EDU 220.', date: 'Today', read: false },
    { id: 3, icon: '🎓', title: 'Semester registration', message: 'Registration closes on 10 October.', date: 'Yesterday', read: true }
  ],
  units: [
    { code: 'EDU 220', name: 'Educational Psychology' },
    { code: 'CHE 214', name: 'Organic Chemistry' },
    { code: 'EDU 216', name: 'Teaching Methods' },
    { code: 'MAT 221', name: 'Linear Algebra' },
    { code: 'PHY 210', name: 'Mechanics' },
    { code: 'COM 201', name: 'Communication Skills' }
  ]
};
app.get('/api/units', (_req, res) => {
  res.json(academicDashboard.units);
});
app.listen(port, () => {
  console.log(`Academic hub is available at http://localhost:${port}`);
});
