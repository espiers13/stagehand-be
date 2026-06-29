const testRehearsals = [
  {
    production_id: 1,
    date: "2026-07-14",
    start_time: "10:00",
    end_time: "13:00",
    location: "Studio 3, Manchester",
    notes: "First read-through, full company called",
    called: [1, 2, 3, 4],
  },
  {
    production_id: 1,
    date: "2026-07-16",
    start_time: "14:00",
    end_time: "18:00",
    location: "Studio 3, Manchester",
    notes: "Act 1 blocking",
    called: [1, 2, 3],
  },
  {
    production_id: 1,
    date: "2026-07-21",
    start_time: "10:00",
    end_time: "17:00",
    location: "Studio 3, Manchester",
    notes: "Act 2 blocking",
    called: [2, 3, 4],
  },
];

module.exports = testRehearsals;
