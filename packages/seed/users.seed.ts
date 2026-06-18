// packages/seed/users.seed.ts

export const DEFAULT_PASSWORD_HASH = "$2a$10$abcdefghijklmnopqrstuvDEFGHIJKLMNOPQRSTUVWXYZabcdefgh";

export const DEMO_USERS = [
  {
    email: "admin@jalpaiguri.com",
    name: "Super Admin",
    phone: "9832100001",
    role: "SUPER_ADMIN",
    wardNumber: null,
  },

  {
    email: "chairman@jalpaigurimunicipality.gov.in",
    name: "Barun Kumar Sinha",
    phone: "9832100002",
    role: "CHAIRMAN",
    wardNumber: null,
  },

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

  { email: "worker.01@jalpaiguri.gov.in", name: "Ratan Mandal", phone: "9832200001", role: "FIELD_WORKER", wardNumber: 1 },
  { email: "worker.02@jalpaiguri.gov.in", name: "Sunil Sarkar", phone: "9832200002", role: "FIELD_WORKER", wardNumber: 2 },
  { email: "worker.03@jalpaiguri.gov.in", name: "Dilip Kumar", phone: "9832200003", role: "FIELD_WORKER", wardNumber: 3 },
  { email: "worker.04@jalpaiguri.gov.in", name: "Biswajit Paul", phone: "9832200004", role: "FIELD_WORKER", wardNumber: 4 },
  { email: "worker.05@jalpaiguri.gov.in", name: "Uttam Pal", phone: "9832200005", role: "FIELD_WORKER", wardNumber: 5 },
  { email: "worker.06@jalpaiguri.gov.in", name: "Sushanta Biswas", phone: "9832200006", role: "FIELD_WORKER", wardNumber: 6 },
  { email: "worker.07@jalpaiguri.gov.in", name: "Debashis Adhikari", phone: "9832200007", role: "FIELD_WORKER", wardNumber: 7 },
  { email: "worker.08@jalpaiguri.gov.in", name: "Partha Mondal", phone: "9832200008", role: "FIELD_WORKER", wardNumber: 8 },
  { email: "worker.09@jalpaiguri.gov.in", name: "Asim Banerjee", phone: "9832200009", role: "FIELD_WORKER", wardNumber: 9 },
  { email: "worker.10@jalpaiguri.gov.in", name: "Pradip Chakraborty", phone: "9832200010", role: "FIELD_WORKER", wardNumber: 10 },

  { email: "citizen.demo1@example.com", name: "Ananya Mukherjee", phone: "9800001001", role: "CITIZEN", wardNumber: 4 },
  { email: "citizen.demo2@example.com", name: "Rajesh Sharma", phone: "9800001002", role: "CITIZEN", wardNumber: 9 },
  { email: "citizen.demo3@example.com", name: "Puja Datta", phone: "9800001003", role: "CITIZEN", wardNumber: 12 },
];