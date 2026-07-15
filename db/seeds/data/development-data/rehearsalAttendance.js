const testRehearsalAttendance = [
  { rehearsal_id: 1, user_id: 2, confirmed: true }, // Natalie
  { rehearsal_id: 1, user_id: 3, confirmed: true }, // testuser
  { rehearsal_id: 1, user_id: 1, confirmed: true }, // Emily
  { rehearsal_id: 2, user_id: 2, confirmed: false },
  { rehearsal_id: 2, user_id: 3, confirmed: true },
  { rehearsal_id: 2, user_id: 1, confirmed: true },
];

module.exports = testRehearsalAttendance;
