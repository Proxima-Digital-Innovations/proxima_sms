# Proxima Hub: Seeded Users Reference

All users have the same password for testing: `password123`
The tenant URL is: `http://kingscollege.proximahub.localhost:9002`

## 🛡️ Platform Admin
| Role | Email | Purpose |
| :--- | :--- | :--- |
| **Super Admin** | `admin@proximahub.com` | Global platform management (isolated) |

## 🏫 King's College Staff
| Role | Email | Name |
| :--- | :--- | :--- |
| **School Admin** | `admin@kings.edu` | Arthur Pendragon |
| **SLT (Senior Lead)** | `slt@kings.edu` | Morgana LeFey |
| **HOD (Science)** | `hod.science@kings.edu` | Merlin Ambrosius |
| **HOD (Arts)** | `hod.arts@kings.edu` | Guinevere Wilde |
| **Teacher** | `teacher1@kings.edu` | Lancelot DuLac |
| **Teacher** | `teacher2@kings.edu` | Gawain Orkney |
| **Accountant** | `accountant@kings.edu` | Bors TheElder |
| **Exam Officer** | `exams@kings.edu` | Percival Knight |

## 👨‍👩‍👧‍👦 Parents & Students
| Parent Email | Linked Student |
| :--- | :--- |
| `parent1@gmail.com` | John Doe (G10) |
| `parent2@gmail.com` | Jane Smith (G10) |
| `parent3@gmail.com` | Bob Johnson (G11) |
| `parent4@gmail.com` | Alice Williams (G11) |

---
## 🛠️ Testing Tip
To test **Isolation**, attempt to log in with `admin@kings.edu` at `queensacademy.proximahub.localhost:9002`. It should fail or block access to data.
