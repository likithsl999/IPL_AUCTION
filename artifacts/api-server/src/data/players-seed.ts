// 600+ IPL players dataset (real stars + generated players)
// Roles: Batsman, Bowler, All-rounder, Wicketkeeper
// Nationalities: Indian, Australian, English, South African, West Indian, Sri Lankan, New Zealand, Bangladesh, Afghan, Pakistan

export interface SeedPlayer {
  name: string;
  role: "Batsman" | "Bowler" | "All-rounder" | "Wicketkeeper";
  basePrice: number; // Crores
  skillRating: number; // 1-100
  nationality: string;
}

// Real star players
export const REAL_PLAYERS: SeedPlayer[] = [
  // TOP STARS
  { name: "Virat Kohli", role: "Batsman", basePrice: 2, skillRating: 98, nationality: "Indian" },
  { name: "MS Dhoni", role: "Wicketkeeper", basePrice: 2, skillRating: 97, nationality: "Indian" },
  { name: "Rohit Sharma", role: "Batsman", basePrice: 2, skillRating: 96, nationality: "Indian" },
  { name: "Jasprit Bumrah", role: "Bowler", basePrice: 2, skillRating: 97, nationality: "Indian" },
  { name: "Hardik Pandya", role: "All-rounder", basePrice: 2, skillRating: 94, nationality: "Indian" },
  { name: "KL Rahul", role: "Wicketkeeper", basePrice: 2, skillRating: 93, nationality: "Indian" },
  { name: "Ravindra Jadeja", role: "All-rounder", basePrice: 2, skillRating: 95, nationality: "Indian" },
  { name: "Suryakumar Yadav", role: "Batsman", basePrice: 2, skillRating: 94, nationality: "Indian" },
  { name: "Shubman Gill", role: "Batsman", basePrice: 2, skillRating: 92, nationality: "Indian" },
  { name: "Rishabh Pant", role: "Wicketkeeper", basePrice: 2, skillRating: 93, nationality: "Indian" },

  // OVERSEAS STARS
  { name: "Pat Cummins", role: "All-rounder", basePrice: 2, skillRating: 96, nationality: "Australian" },
  { name: "David Warner", role: "Batsman", basePrice: 2, skillRating: 92, nationality: "Australian" },
  { name: "Steve Smith", role: "Batsman", basePrice: 1.5, skillRating: 90, nationality: "Australian" },
  { name: "Mitchell Starc", role: "Bowler", basePrice: 2, skillRating: 92, nationality: "Australian" },
  { name: "Glenn Maxwell", role: "All-rounder", basePrice: 2, skillRating: 91, nationality: "Australian" },
  { name: "Josh Hazlewood", role: "Bowler", basePrice: 2, skillRating: 91, nationality: "Australian" },
  { name: "Marcus Stoinis", role: "All-rounder", basePrice: 1.5, skillRating: 87, nationality: "Australian" },
  { name: "Travis Head", role: "Batsman", basePrice: 2, skillRating: 90, nationality: "Australian" },
  { name: "Tim David", role: "Batsman", basePrice: 2, skillRating: 86, nationality: "Singaporean" },
  { name: "Cameron Green", role: "All-rounder", basePrice: 2, skillRating: 85, nationality: "Australian" },

  { name: "Ben Stokes", role: "All-rounder", basePrice: 2, skillRating: 95, nationality: "English" },
  { name: "Jos Buttler", role: "Wicketkeeper", basePrice: 2, skillRating: 94, nationality: "English" },
  { name: "Sam Curran", role: "All-rounder", basePrice: 2, skillRating: 87, nationality: "English" },
  { name: "Liam Livingstone", role: "All-rounder", basePrice: 1.5, skillRating: 86, nationality: "English" },
  { name: "Mark Wood", role: "Bowler", basePrice: 1.5, skillRating: 88, nationality: "English" },
  { name: "Moeen Ali", role: "All-rounder", basePrice: 1, skillRating: 84, nationality: "English" },
  { name: "Jonny Bairstow", role: "Wicketkeeper", basePrice: 1.5, skillRating: 87, nationality: "English" },
  { name: "Phil Salt", role: "Wicketkeeper", basePrice: 1, skillRating: 82, nationality: "English" },
  { name: "Will Jacks", role: "All-rounder", basePrice: 1, skillRating: 80, nationality: "English" },
  { name: "Jofra Archer", role: "Bowler", basePrice: 2, skillRating: 92, nationality: "English" },

  { name: "Kagiso Rabada", role: "Bowler", basePrice: 2, skillRating: 93, nationality: "South African" },
  { name: "Quinton de Kock", role: "Wicketkeeper", basePrice: 1.5, skillRating: 90, nationality: "South African" },
  { name: "David Miller", role: "Batsman", basePrice: 1.5, skillRating: 88, nationality: "South African" },
  { name: "Faf du Plessis", role: "Batsman", basePrice: 1.5, skillRating: 89, nationality: "South African" },
  { name: "Anrich Nortje", role: "Bowler", basePrice: 1.5, skillRating: 90, nationality: "South African" },
  { name: "Marco Jansen", role: "All-rounder", basePrice: 1, skillRating: 83, nationality: "South African" },
  { name: "Reeza Hendricks", role: "Batsman", basePrice: 0.5, skillRating: 78, nationality: "South African" },
  { name: "Rassie van der Dussen", role: "Batsman", basePrice: 1, skillRating: 84, nationality: "South African" },
  { name: "Lungi Ngidi", role: "Bowler", basePrice: 1, skillRating: 82, nationality: "South African" },
  { name: "Aiden Markram", role: "Batsman", basePrice: 1, skillRating: 85, nationality: "South African" },

  { name: "Andre Russell", role: "All-rounder", basePrice: 2, skillRating: 95, nationality: "West Indian" },
  { name: "Sunil Narine", role: "All-rounder", basePrice: 2, skillRating: 94, nationality: "West Indian" },
  { name: "Nicholas Pooran", role: "Wicketkeeper", basePrice: 1.5, skillRating: 88, nationality: "West Indian" },
  { name: "Shimron Hetmyer", role: "Batsman", basePrice: 1, skillRating: 84, nationality: "West Indian" },
  { name: "Jason Holder", role: "All-rounder", basePrice: 1, skillRating: 83, nationality: "West Indian" },
  { name: "Obed McCoy", role: "Bowler", basePrice: 0.5, skillRating: 78, nationality: "West Indian" },
  { name: "Rovman Powell", role: "Batsman", basePrice: 1, skillRating: 82, nationality: "West Indian" },
  { name: "Kyle Mayers", role: "All-rounder", basePrice: 0.5, skillRating: 79, nationality: "West Indian" },
  { name: "Akeal Hosein", role: "Bowler", basePrice: 0.5, skillRating: 76, nationality: "West Indian" },
  { name: "Brandon King", role: "Batsman", basePrice: 0.5, skillRating: 75, nationality: "West Indian" },

  { name: "Rashid Khan", role: "Bowler", basePrice: 2, skillRating: 96, nationality: "Afghan" },
  { name: "Mohammad Nabi", role: "All-rounder", basePrice: 1, skillRating: 83, nationality: "Afghan" },
  { name: "Mujeeb ur Rahman", role: "Bowler", basePrice: 1, skillRating: 82, nationality: "Afghan" },
  { name: "Noor Ahmad", role: "Bowler", basePrice: 0.5, skillRating: 78, nationality: "Afghan" },
  { name: "Hazratullah Zazai", role: "Batsman", basePrice: 0.5, skillRating: 75, nationality: "Afghan" },

  { name: "Trent Boult", role: "Bowler", basePrice: 1.5, skillRating: 91, nationality: "New Zealand" },
  { name: "Kane Williamson", role: "Batsman", basePrice: 1.5, skillRating: 90, nationality: "New Zealand" },
  { name: "Lockie Ferguson", role: "Bowler", basePrice: 1, skillRating: 85, nationality: "New Zealand" },
  { name: "Devon Conway", role: "Wicketkeeper", basePrice: 1, skillRating: 84, nationality: "New Zealand" },
  { name: "Mitchell Santner", role: "All-rounder", basePrice: 0.5, skillRating: 80, nationality: "New Zealand" },
  { name: "Glenn Phillips", role: "Batsman", basePrice: 1, skillRating: 83, nationality: "New Zealand" },
  { name: "Finn Allen", role: "Batsman", basePrice: 0.5, skillRating: 77, nationality: "New Zealand" },
  { name: "Adam Milne", role: "Bowler", basePrice: 0.5, skillRating: 76, nationality: "New Zealand" },

  { name: "Shakib Al Hasan", role: "All-rounder", basePrice: 1, skillRating: 87, nationality: "Bangladeshi" },
  { name: "Litton Das", role: "Wicketkeeper", basePrice: 0.5, skillRating: 78, nationality: "Bangladeshi" },
  { name: "Mustafizur Rahman", role: "Bowler", basePrice: 1, skillRating: 85, nationality: "Bangladeshi" },
  { name: "Mahmudullah", role: "All-rounder", basePrice: 0.5, skillRating: 77, nationality: "Bangladeshi" },

  { name: "Wanindu Hasaranga", role: "All-rounder", basePrice: 1.5, skillRating: 89, nationality: "Sri Lankan" },
  { name: "Dushmantha Chameera", role: "Bowler", basePrice: 0.5, skillRating: 80, nationality: "Sri Lankan" },
  { name: "Matheesha Pathirana", role: "Bowler", basePrice: 1, skillRating: 85, nationality: "Sri Lankan" },
  { name: "Kusal Mendis", role: "Wicketkeeper", basePrice: 0.5, skillRating: 78, nationality: "Sri Lankan" },
  { name: "Chamika Karunaratne", role: "All-rounder", basePrice: 0.5, skillRating: 75, nationality: "Sri Lankan" },

  // KEY INDIAN PLAYERS
  { name: "Shreyas Iyer", role: "Batsman", basePrice: 2, skillRating: 90, nationality: "Indian" },
  { name: "Yashasvi Jaiswal", role: "Batsman", basePrice: 2, skillRating: 91, nationality: "Indian" },
  { name: "Ruturaj Gaikwad", role: "Batsman", basePrice: 2, skillRating: 89, nationality: "Indian" },
  { name: "Ishan Kishan", role: "Wicketkeeper", basePrice: 2, skillRating: 88, nationality: "Indian" },
  { name: "Sanju Samson", role: "Wicketkeeper", basePrice: 2, skillRating: 89, nationality: "Indian" },
  { name: "Deepak Chahar", role: "All-rounder", basePrice: 1.4, skillRating: 84, nationality: "Indian" },
  { name: "Mohammed Shami", role: "Bowler", basePrice: 2, skillRating: 92, nationality: "Indian" },
  { name: "Arshdeep Singh", role: "Bowler", basePrice: 2, skillRating: 88, nationality: "Indian" },
  { name: "Yuzvendra Chahal", role: "Bowler", basePrice: 1.8, skillRating: 88, nationality: "Indian" },
  { name: "Kuldeep Yadav", role: "Bowler", basePrice: 1.5, skillRating: 87, nationality: "Indian" },
  { name: "Axar Patel", role: "All-rounder", basePrice: 2, skillRating: 87, nationality: "Indian" },
  { name: "Shardul Thakur", role: "All-rounder", basePrice: 1, skillRating: 84, nationality: "Indian" },
  { name: "Rinku Singh", role: "Batsman", basePrice: 2, skillRating: 85, nationality: "Indian" },
  { name: "Tilak Varma", role: "Batsman", basePrice: 2, skillRating: 84, nationality: "Indian" },
  { name: "Washington Sundar", role: "All-rounder", basePrice: 0.5, skillRating: 82, nationality: "Indian" },
  { name: "Rahul Tripathi", role: "Batsman", basePrice: 0.5, skillRating: 80, nationality: "Indian" },
  { name: "Shivam Dube", role: "All-rounder", basePrice: 1, skillRating: 82, nationality: "Indian" },
  { name: "Nitish Kumar Reddy", role: "All-rounder", basePrice: 0.5, skillRating: 78, nationality: "Indian" },
  { name: "Harshit Rana", role: "Bowler", basePrice: 0.5, skillRating: 77, nationality: "Indian" },
  { name: "Varun Chakaravarthy", role: "Bowler", basePrice: 1.2, skillRating: 84, nationality: "Indian" },
  { name: "Naman Dhir", role: "Batsman", basePrice: 0.5, skillRating: 76, nationality: "Indian" },
  { name: "Abhishek Sharma", role: "All-rounder", basePrice: 1.4, skillRating: 82, nationality: "Indian" },
  { name: "Prabhsimran Singh", role: "Wicketkeeper", basePrice: 0.5, skillRating: 77, nationality: "Indian" },
  { name: "Dhruv Jurel", role: "Wicketkeeper", basePrice: 0.5, skillRating: 76, nationality: "Indian" },
  { name: "Aryan Juyal", role: "Wicketkeeper", basePrice: 0.2, skillRating: 70, nationality: "Indian" },
  { name: "Riyan Parag", role: "All-rounder", basePrice: 1, skillRating: 80, nationality: "Indian" },
  { name: "Tanush Kotian", role: "All-rounder", basePrice: 0.2, skillRating: 72, nationality: "Indian" },
  { name: "Mayank Yadav", role: "Bowler", basePrice: 1, skillRating: 83, nationality: "Indian" },
  { name: "Akash Madhwal", role: "Bowler", basePrice: 0.2, skillRating: 75, nationality: "Indian" },
  { name: "Tushar Deshpande", role: "Bowler", basePrice: 0.2, skillRating: 74, nationality: "Indian" },
];

// Generated player pools for reaching 600+
const FIRST_NAMES_INDIAN = [
  "Aarav","Advaith","Akshay","Amit","Ankit","Arjun","Arnav","Arun","Aswin","Atul",
  "Ayush","Bharat","Chirag","Darshan","Devraj","Dinesh","Gaurav","Harsh","Hemant","Hitesh",
  "Ishaan","Jatin","Karan","Kartik","Kiran","Kunal","Lakshya","Manish","Manoj","Mohit",
  "Neeraj","Nikhil","Nitin","Om","Parth","Pranav","Prashant","Pritam","Priyanshu","Rahul",
  "Raj","Rajat","Rakesh","Ramesh","Ravi","Ritesh","Rohit","Sachin","Sagar","Sahil",
  "Sandeep","Sanjay","Saurav","Shivam","Soham","Sumit","Sunil","Suresh","Tarun","Umesh",
  "Utkarsh","Vaibhav","Vikas","Vikram","Vipul","Vishal","Vivek","Yash","Yogesh","Zaid",
  "Aditya","Ajay","Alok","Amar","Amey","Amol","Anand","Anup","Ashish","Atharva",
  "Deepak","Dhruv","Girish","Gopal","Harish","Jagdish","Jayesh","Jitendra","Kamlesh","Kaushal",
  "Lalit","Madhav","Mahesh","Manan","Manav","Mayank","Mihir","Mithun","Nagesh","Nakul"
];

const LAST_NAMES_INDIAN = [
  "Sharma","Verma","Patel","Singh","Kumar","Yadav","Gupta","Shah","Joshi","Mishra",
  "Pandey","Chauhan","Reddy","Nair","Pillai","Menon","Rao","Iyer","Agarwal","Bansal",
  "Chopra","Das","Dubey","Ghosh","Jain","Kapoor","Malhotra","Mehra","Nanda","Prasad",
  "Saxena","Srivastava","Tiwari","Tripathi","Upadhyay","Walia","Zaveri","Bose","Chandra","Dutta",
  "Goyal","Grover","Hegde","Jindal","Khatri","Lal","More","Murthy","Naidu","Patil",
  "Rawat","Rathore","Sethi","Tandon","Thakur","Varma","Wagle","Khanna","Bajaj","Birla",
  "Garg","Mittal","Acharya","Bhatt","Chokshi","Desai","Gandhi","Kulkarni","Mehta","Naik"
];

const FIRST_NAMES_OVERSEAS = [
  "James","John","William","Ryan","Jake","Liam","Noah","Oliver","Jack","Harry",
  "Charlie","George","Thomas","Daniel","Matthew","Adam","Luke","Ben","Tom","Sam",
  "Chris","Alex","Rob","Nathan","Ethan","Josh","Zac","Tyler","Dylan","Jordan",
  "Michael","Kevin","Jason","Aaron","Drew","Brett","Scott","Brad","Shane","Mark",
  "Ricky","Darren","Greg","Brian","Wayne","Steve","Dave","Peter","Paul","Andrew",
  "Jaylen","Marcus","Darnell","Tyrone","Kwame","Devon","Tremaine","Rashaan","Keion","Malik"
];

const LAST_NAMES_OVERSEAS = [
  "Smith","Johnson","Williams","Jones","Brown","Davis","Miller","Wilson","Moore","Taylor",
  "Anderson","Thomas","Jackson","White","Harris","Martin","Thompson","Garcia","Martinez","Roberts",
  "Robinson","Clark","Rodriguez","Lewis","Lee","Walker","Hall","Allen","Young","Hernandez",
  "King","Wright","Lopez","Hill","Scott","Green","Adams","Baker","Gonzalez","Nelson",
  "Carter","Mitchell","Perez","Roberts","Turner","Phillips","Campbell","Parker","Evans","Edwards",
  "Collins","Stewart","Sanchez","Morris","Rogers","Reed","Cook","Morgan","Bell","Murphy",
  "Bailey","Rivera","Cooper","Richardson","Cox","Howard","Ward","Torres","Peterson","Gray"
];

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 1): number {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const ROLES: SeedPlayer["role"][] = ["Batsman", "Bowler", "All-rounder", "Wicketkeeper"];
const ROLE_WEIGHTS = [35, 35, 20, 10]; // percentage distribution

function weightedRole(): SeedPlayer["role"] {
  const rand = Math.random() * 100;
  let cum = 0;
  for (let i = 0; i < ROLES.length; i++) {
    cum += ROLE_WEIGHTS[i];
    if (rand < cum) return ROLES[i];
  }
  return "Batsman";
}

// Generate base price from skill rating
function basePriceFromRating(rating: number): number {
  if (rating >= 90) return randomFloat(1.5, 2.0);
  if (rating >= 80) return randomFloat(0.5, 1.5);
  if (rating >= 70) return randomFloat(0.2, 0.5);
  return 0.2;
}

// Generate Indian players
function generateIndianPlayers(count: number): SeedPlayer[] {
  const players: SeedPlayer[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    let name: string;
    let attempts = 0;
    do {
      name = `${randomItem(FIRST_NAMES_INDIAN)} ${randomItem(LAST_NAMES_INDIAN)}`;
      attempts++;
    } while (usedNames.has(name) && attempts < 50);
    usedNames.add(name);

    const rating = randomBetween(55, 85);
    players.push({
      name,
      role: weightedRole(),
      basePrice: basePriceFromRating(rating),
      skillRating: rating,
      nationality: "Indian",
    });
  }
  return players;
}

// Generate overseas players
function generateOverseasPlayers(count: number): SeedPlayer[] {
  const players: SeedPlayer[] = [];
  const nationalities = ["Australian","English","South African","West Indian","New Zealand","Sri Lankan","Bangladeshi","Afghan","Zimbabwean","Irish","Scottish","Namibian","UAE","Netherlands","Kenya","Uganda","Singapore","Canada","USA","Afghanistan"];
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    let name: string;
    let attempts = 0;
    do {
      name = `${randomItem(FIRST_NAMES_OVERSEAS)} ${randomItem(LAST_NAMES_OVERSEAS)}`;
      attempts++;
    } while (usedNames.has(name) && attempts < 50);
    usedNames.add(name);

    const rating = randomBetween(55, 82);
    players.push({
      name,
      role: weightedRole(),
      basePrice: basePriceFromRating(rating),
      skillRating: rating,
      nationality: randomItem(nationalities),
    });
  }
  return players;
}

// Build the full player list — real players + generated to reach 600+
export function buildAllPlayers(): SeedPlayer[] {
  const realCount = REAL_PLAYERS.length; // ~130 real players
  const extraIndian = generateIndianPlayers(320);
  const extraOverseas = generateOverseasPlayers(180);

  const all = [...REAL_PLAYERS, ...extraIndian, ...extraOverseas];

  // Shuffle so generated and real players are mixed (Fisher-Yates)
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  return all;
}
