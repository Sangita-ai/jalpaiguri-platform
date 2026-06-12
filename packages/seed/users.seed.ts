// packages/seed/users.seed.ts

import bcrypt from "bcryptjs";

export const DEFAULT_PASSWORD_HASH = bcrypt.hashSync("Demo@1234", 10);

export const DEMO_USERS = [
  // Super Admin
  {
    email: "admin@jalpaigurimunicipality.gov.in",
    name: "Subrata Chakraborty",
    phone: "9832100001",
    role: "SUPER_ADMIN",
    wardNumber: null,
  },
  // Chairman
  {
    email: "chairman@jalpaigurimunicipality.gov.in",
    name: "Barun Kumar Sinh",
    phone: "9832100002",
    role: "CHAIRMAN",
    wardNumber: null,
  },
  // Municipal Officers
  {
    email: "officer.north@jalpaigurimunicipality.gov.in",
    name: "Dipankar Roy",
    phone: "9832100003",
    role: "MUNICIPAL_OFFICER",
    wardNumber: 1,
  },
  {
    email: "officer.south@jalpaigurimunicipality.gov.in",
    name: "Pratima Dey",
    phone: "9832100004",
    role: "MUNICIPAL_OFFICER",
    wardNumber: 9,
  },
  {
    email: "officer.east@jalpaigurimunicipality.gov.in",
    name: "Sanjib Barman",
    phone: "9832100005",
    role: "MUNICIPAL_OFFICER",
    wardNumber: 17,
  },
  // Department Heads
  {
    email: "depthead.sanitation@jalpaigurimunicipality.gov.in",
    name: "Mousumi Bhattacharya",
    phone: "9832100006",
    role: "DEPT_HEAD",
    wardNumber: null,
  },
  {
    email: "depthead.water@jalpaigurimunicipality.gov.in",
    name: "Arun Ghosh",
    phone: "9832100007",
    role: "DEPT_HEAD",
    wardNumber: null,
  },
  {
    email: "depthead.roads@jalpaigurimunicipality.gov.in",
    name: "Tanmoy Das",
    phone: "9832100008",
    role: "DEPT_HEAD",
    wardNumber: null,
  },
  // Field Workers (20 workers, one per ward approximately)
  { email: "worker.01@jalpaiguri.gov.in", name: "Ratan Mandal",     phone: "9832200001", role: "FIELD_WORKER", wardNumber: 1  },
  { email: "worker.02@jalpaiguri.gov.in", name: "Sunil Sarkar",     phone: "9832200002", role: "FIELD_WORKER", wardNumber: 2  },
  { email: "worker.03@jalpaiguri.gov.in", name: "Dilip Kumar",      phone: "9832200003", role: "FIELD_WORKER", wardNumber: 3  },
  { email: "worker.04@jalpaiguri.gov.in", name: "Biswajit Paul",    phone: "9832200004", role: "FIELD_WORKER", wardNumber: 4  },
  { email: "worker.05@jalpaiguri.gov.in", name: "Uttam Pal",        phone: "9832200005", role: "FIELD_WORKER", wardNumber: 5  },
  { email: "worker.06@jalpaiguri.gov.in", name: "Sushanta Biswas",  phone: "9832200006", role: "FIELD_WORKER", wardNumber: 6  },
  { email: "worker.07@jalpaiguri.gov.in", name: "Debashis Adhikari",phone: "9832200007", role: "FIELD_WORKER", wardNumber: 7  },
  { email: "worker.08@jalpaiguri.gov.in", name: "Partha Mondal",    phone: "9832200008", role: "FIELD_WORKER", wardNumber: 8  },
  { email: "worker.09@jalpaiguri.gov.in", name: "Asim Banerjee",    phone: "9832200009", role: "FIELD_WORKER", wardNumber: 9  },
  { email: "worker.10@jalpaiguri.gov.in", name: "Pradip Chakraborty",phone: "9832200010", role: "FIELD_WORKER", wardNumber: 10 },
  { email: "worker.11@jalpaiguri.gov.in", name: "Tapas Roy",        phone: "9832200011", role: "FIELD_WORKER", wardNumber: 11 },
  { email: "worker.12@jalpaiguri.gov.in", name: "Rajib Das",        phone: "9832200012", role: "FIELD_WORKER", wardNumber: 12 },
  { email: "worker.13@jalpaiguri.gov.in", name: "Nirupam Dey",      phone: "9832200013", role: "FIELD_WORKER", wardNumber: 13 },
  { email: "worker.14@jalpaiguri.gov.in", name: "Anil Singha",      phone: "9832200014", role: "FIELD_WORKER", wardNumber: 14 },
  { email: "worker.15@jalpaiguri.gov.in", name: "Manas Barman",     phone: "9832200015", role: "FIELD_WORKER", wardNumber: 15 },
  { email: "worker.16@jalpaiguri.gov.in", name: "Kaushik Ghosh",    phone: "9832200016", role: "FIELD_WORKER", wardNumber: 16 },
  { email: "worker.17@jalpaiguri.gov.in", name: "Sandip Karmakar",  phone: "9832200017", role: "FIELD_WORKER", wardNumber: 17 },
  { email: "worker.18@jalpaiguri.gov.in", name: "Prabir Bose",      phone: "9832200018", role: "FIELD_WORKER", wardNumber: 18 },
  { email: "worker.19@jalpaiguri.gov.in", name: "Tridib Saha",      phone: "9832200019", role: "FIELD_WORKER", wardNumber: 19 },
  { email: "worker.20@jalpaiguri.gov.in", name: "Sankar Pal",       phone: "9832200020", role: "FIELD_WORKER", wardNumber: 20 },
  // Demo citizens
  { email: "citizen.demo1@example.com", name: "Ananya Mukherjee", phone: "9800001001", role: "CITIZEN", wardNumber: 4  },
  { email: "citizen.demo2@example.com", name: "Rajesh Sharma",    phone: "9800001002", role: "CITIZEN", wardNumber: 9  },
  { email: "citizen.demo3@example.com", name: "Puja Datta",       phone: "9800001003", role: "CITIZEN", wardNumber: 12 },
  { email: "citizen.demo4@example.com", name: "Manoj Mahato",     phone: "9800001004", role: "CITIZEN", wardNumber: 7  },
  { email: "citizen.demo5@example.com", name: "Sunita Gurung",    phone: "9800001005", role: "CITIZEN", wardNumber: 15 },
];
