const trains = [
  {
    number: "12301",
    name: "Rajdhani Express",
    from: "Howrah",
    to: "New Delhi",
    current: "Durgapur",
    next: "Asansol",
    delay: 12,
    delayText: "+12 min",
    arrival: "10:42 PM",
    speed: 82,
    distanceRemaining: 1124,
    progress: 52,
    status: "Running",
    route: [
      {
        station: "Howrah",
        code: "HWH",
        arrival: "04:45 PM",
        departure: "04:55 PM",
        status: "completed"
      },
      {
        station: "Bardhaman",
        code: "BWN",
        arrival: "05:58 PM",
        departure: "06:02 PM",
        status: "completed"
      },
      {
        station: "Durgapur",
        code: "DGR",
        arrival: "06:48 PM",
        departure: "06:53 PM",
        status: "current"
      },
      {
        station: "Asansol",
        code: "ASN",
        arrival: "07:12 PM",
        departure: "07:18 PM",
        status: "upcoming"
      },
      {
        station: "Dhanbad",
        code: "DHN",
        arrival: "08:14 PM",
        departure: "08:19 PM",
        status: "upcoming"
      },
      {
        station: "New Delhi",
        code: "NDLS",
        arrival: "10:42 PM",
        departure: "-",
        status: "destination"
      }
    ]
  },

  {
    number: "12841",
    name: "Coromandel Express",
    from: "Shalimar",
    to: "Chennai Central",
    current: "Kharagpur",
    next: "Balasore",
    delay: 6,
    delayText: "+6 min",
    arrival: "09:18 PM",
    speed: 76,
    distanceRemaining: 890,
    progress: 46,
    status: "Running",
    route: [
      {
        station: "Shalimar",
        code: "SHM",
        arrival: "03:30 PM",
        departure: "03:40 PM",
        status: "completed"
      },
      {
        station: "Kharagpur",
        code: "KGP",
        arrival: "05:05 PM",
        departure: "05:12 PM",
        status: "current"
      },
      {
        station: "Balasore",
        code: "BLS",
        arrival: "06:42 PM",
        departure: "06:47 PM",
        status: "upcoming"
      },
      {
        station: "Bhubaneswar",
        code: "BBS",
        arrival: "08:25 PM",
        departure: "08:30 PM",
        status: "upcoming"
      },
      {
        station: "Chennai Central",
        code: "MAS",
        arrival: "09:18 PM",
        departure: "-",
        status: "destination"
      }
    ]
  },

  {
    number: "12019",
    name: "Shatabdi Express",
    from: "Howrah",
    to: "Ranchi",
    current: "Bardhaman",
    next: "Durgapur",
    delay: 3,
    delayText: "+3 min",
    arrival: "07:55 PM",
    speed: 91,
    distanceRemaining: 235,
    progress: 61,
    status: "Running",
    route: [
      {
        station: "Howrah",
        code: "HWH",
        arrival: "02:10 PM",
        departure: "02:20 PM",
        status: "completed"
      },
      {
        station: "Bardhaman",
        code: "BWN",
        arrival: "03:20 PM",
        departure: "03:25 PM",
        status: "current"
      },
      {
        station: "Durgapur",
        code: "DGR",
        arrival: "04:15 PM",
        departure: "04:20 PM",
        status: "upcoming"
      },
      {
        station: "Ranchi",
        code: "RNC",
        arrival: "07:55 PM",
        departure: "-",
        status: "destination"
      }
    ]
  }
];

export default trains;