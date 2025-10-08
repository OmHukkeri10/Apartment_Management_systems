const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const cron = require('node-cron');
const bodyParser = require('body-parser');

const app = express();
// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MySQL database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Koushik@07',
  database: 'FlatManagement'
});

db.connect(err => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});

// API endpoint to fetch flat details
app.get('/flats', (req, res) => {
  const query = `
    SELECT 
      O.name AS OwnerName, 
      O.mobile AS OwnerMobile, 
      O.email AS OwnerEmail, 
      O.aadhaar_number AS OwnerAadhaar,
      F.flat_number, 
      F.is_owner_residing, 
      F.tenant_name, 
      F.tenant_mobile, 
      F.tenant_email, 
      F.tenant_aadhaar_number,
      FD.number_of_members, 
      FD.male_count, 
      FD.female_count, 
      FD.child_count,
      VD.vehicle_type, 
      VD.registration_number
    FROM Owners O
    JOIN flats F ON O.owner_id = F.owner_id
    LEFT JOIN FamilyDetails FD ON F.flat_number = FD.flat_number
    LEFT JOIN VehicleDetails VD ON F.flat_number = VD.flat_number
    ORDER BY F.flat_number, VD.id;
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).send(err);

    // Group data by flat_number
    const flats = {};
    results.forEach(row => {
      if (!flats[row.flat_number]) {
        flats[row.flat_number] = {
          flat_number: row.flat_number,
          OwnerName: row.OwnerName,
          OwnerMobile: row.OwnerMobile,
          OwnerEmail: row.OwnerEmail,
          OwnerAadhaar: row.OwnerAadhaar,
          is_owner_residing: row.is_owner_residing,
          tenant_name: row.tenant_name,
          tenant_mobile: row.tenant_mobile,
          tenant_email: row.tenant_email,
          tenant_aadhaar_number: row.tenant_aadhaar_number,
          number_of_members: row.number_of_members,
          male_count: row.male_count,
          female_count: row.female_count,
          child_count: row.child_count,
          vehicles: []
        };
      }
      if (row.vehicle_type && row.registration_number) {
        flats[row.flat_number].vehicles.push({
          type: row.vehicle_type,
          registrationNumber: row.registration_number
        });
      }
    });

    // Add vehicle count to each flat
    const flatDetails = Object.values(flats).map(flat => ({
      ...flat,
      vehicle_count: flat.vehicles.length
    }));

    res.json(flatDetails);
  });
});





// API endpoint to fetch owner details by vehicle registration number

app.get('/vehicle', (req, res) => {
  const registrationNumber = req.query.registration_number;
  if (!registrationNumber) {
    return res.status(400).json({ error: 'Registration number is required' });
  }

  const query = `
    SELECT 
      O.name AS OwnerName, 
      F.flat_number,
      o.mobile AS mobile
    FROM VehicleDetails VD
    JOIN Flats F ON VD.flat_number = F.flat_number
    JOIN Owners O ON F.owner_id = O.owner_id
    WHERE VD.registration_number = ?
  `;

  db.query(query, [registrationNumber], (err, results) => {
    if (err) return res.status(500).send(err);
    if (results.length === 0) {
      return res.status(404).json({ message: 'This vehicle does not belong to your apartment.' });
    }

    res.json(results[0]);
  });
});

// API endpoint for login
app.post('/login', (req, res) => {
  const { flat_number, email, password } = req.body;

  const query = `
    SELECT * FROM flat_credentials
    WHERE flat_number = ? AND email = ? AND password = ?
  `;
  
  db.query(query, [flat_number, email, password], (err, results) => {
    if (err) return res.status(500).send({ error: 'Database query error' });

    if (results.length > 0) {
      res.status(200).send({ message: 'Login successful' });
    } else {
      res.status(400).send({ error: 'Invalid credentials' });
    }
  });
});

// API endpoint to fetch owner details and other information for dashboard
app.get('/dashboard/:flat_number', (req, res) => {
  const flat_number = req.params.flat_number;

  const query = `
    SELECT O.name AS owner_name, O.mobile AS owner_mobile, O.email AS owner_email, O.aadhaar_number AS owner_aadhaar,
           F.tenant_name, F.tenant_mobile, F.tenant_email, F.tenant_aadhaar_number,
           FD.number_of_members, FD.male_count, FD.female_count, FD.child_count,
           VD.vehicle_type, VD.registration_number
    FROM Owners O
    JOIN Flats F ON O.owner_id = F.owner_id
    LEFT JOIN FamilyDetails FD ON F.flat_number = FD.flat_number
    LEFT JOIN VehicleDetails VD ON F.flat_number = VD.flat_number
    WHERE F.flat_number = ?
  `;

  db.query(query, [flat_number], (err, results) => {
    if (err) return res.status(500).send({ error: 'Database query error' });

    if (results.length > 0) {
      res.status(200).json(results[0]);
    } else {
      res.status(404).send({ error: 'No data found for this flat number' });
    }
  });
});




// Fetch dashboard details for a specific flat
app.get('/dashboard/:flatNumber', (req, res) => {
  const flatNumber = req.params.flatNumber;

  const query = `
    SELECT 
      O.name AS owner_name, 
      O.mobile AS owner_mobile, 
      O.email AS owner_email, 
      O.aadhaar_number AS owner_aadhaar,
      F.flat_number, 
      F.is_owner_residing, 
      F.tenant_name, 
      F.tenant_mobile, 
      F.tenant_email, 
      F.tenant_aadhaar_number,
      FD.number_of_members, 
      FD.male_count, 
      FD.female_count, 
      FD.child_count,
      VD.vehicle_type, 
      VD.registration_number
    FROM Flats F
    LEFT JOIN Owners O ON F.owner_id = O.owner_id
    LEFT JOIN FamilyDetails FD ON F.flat_number = FD.flat_number
    LEFT JOIN VehicleDetails VD ON F.flat_number = VD.flat_number
    WHERE F.flat_number = ?
  `;

  db.query(query, [flatNumber], (err, results) => {
    if (err) return res.status(500).send(err);

    if (results.length === 0) {
      return res.status(404).send({ error: 'No details found for this flat number' });
    }

    // Consolidate vehicle details into an array
    const vehicles = results
      .filter(row => row.vehicle_type && row.registration_number)
      .map(row => ({
        type: row.vehicle_type,
        registration_number: row.registration_number
      }));

    const response = {
      flat_number: flatNumber,
      owner_name: results[0].owner_name,
      owner_mobile: results[0].owner_mobile,
      owner_email: results[0].owner_email,
      owner_aadhaar: results[0].owner_aadhaar,
      number_of_members: results[0].number_of_members,
      male_count: results[0].male_count,
      female_count: results[0].female_count,
      child_count: results[0].child_count,
      vehicles
    };

    res.json(response);
  });
});





app.post('/login', (req, res) => {
  const { flatNumber, email, password } = req.body;
  const query = `SELECT * FROM flat_credentials WHERE flat_number = ? AND email = ? AND password = ?`;

  db.query(query, [flatNumber, email, password], (err, results) => {
    if (err) throw err;

    if (results.length > 0) {
      req.session.flatNumber = flatNumber;
      res.status(200).send();
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  });
});

app.get('/flatDetails', (req, res) => {
  const flatNumber = req.session.flatNumber;

  if (!flatNumber) return res.status(401).send();

  const query = `
    SELECT * FROM flats 
    LEFT JOIN owners ON flats.owner_id = owners.owner_id
    LEFT JOIN familydetails ON flats.flat_number = familydetails.flat_number
    LEFT JOIN vehicledetails ON flats.flat_number = vehicledetails.flat_number
    WHERE flats.flat_number = ?`;

  db.query(query, [flatNumber], (err, results) => {
    if (err) throw err;

    const flatDetails = {
      ownerInfo: results[0] ? {
        name: results[0].name,
        mobile: results[0].mobile,
        email: results[0].email,
        aadhaar_number: results[0].aadhaar_number,
      } : {},
      familyDetails: results[0] ? {
        number_of_members: results[0].number_of_members,
        male_count: results[0].male_count,
        female_count: results[0].female_count,
        child_count: results[0].child_count,
      } : {},
      vehicleDetails: results.map(r => ({
        vehicle_type: r.vehicle_type,
        registration_number: r.registration_number,
      })),
    };

    res.json(flatDetails);
  });
});



// // Fetch Employee Details
// app.get('/api/employees', (req, res) => {
//   db.query('SELECT * FROM employeedetails', (err, results) => {
//       if (err) {
//           console.error('Error fetching employees:', err);
//           res.status(500).json({ error: 'Failed to fetch employees' });
//       } else {
//           res.json(results);
//       }
//   });
// });

// // Reset Endpoint (Triggered by Frontend)
// app.post('/api/reset', (req, res) => {
//   db.query(
//       'UPDATE employeedetails SET Date = NULL, CheckInTime = NULL, CheckOutTime = NULL',
//       (err) => {
//           if (err) {
//               console.error('Error during reset:', err);
//               res.status(500).json({ error: 'Failed to reset data' });
//           } else {
//               res.sendStatus(200);
//           }
//       }
//   );
// });

// app.post('/api/checkin/:id', (req, res) => {
//   const employeeID = req.params.id;
//   const now = new Date();
//   const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
//   const time = now.toTimeString().split(' ')[0]; // HH:MM:SS

//   console.log(`Checking in EmployeeID: ${employeeID} at ${date} ${time}`);

//   // Check if the employee already has a log for today
//   db.query(
//       'SELECT * FROM EmployeeLogs WHERE EmployeeID = ? AND Date = ?',
//       [employeeID, date],
//       (err, results) => {
//           if (err) {
//               console.error('Error checking existing log:', err);
//               res.status(500).json({ error: 'Failed to check existing log' });
//               return;
//           }

//           if (results.length > 0) {
//               // Log already exists for today
//               res.status(400).json({ error: 'Check-In already logged for today' });
//           } else {
//               // Insert new log for today
//               db.query(
//                   'INSERT INTO EmployeeLogs (EmployeeID, Date, CheckInTime) VALUES (?, ?, ?)',
//                   [employeeID, date, time],
//                   (err) => {
//                       if (err) {
//                           console.error('Error logging Check-In:', err);
//                           res.status(500).json({ error: 'Failed to log Check-In' });
//                       } else {
//                           console.log('Check-In logged successfully');
//                           res.sendStatus(200);
//                       }
//                   }
//               );
//           }
//       }
//   );
// });


// app.post('/api/checkout/:id', (req, res) => {
//   const employeeID = req.params.id;
//   const now = new Date();
//   const date = now.toISOString().split('T')[0];
//   const time = now.toTimeString().split(' ')[0];

//   console.log(`Checking out EmployeeID: ${employeeID} at ${date} ${time}`);

//   // Update the CheckOutTime for today's log
//   db.query(
//       'UPDATE EmployeeLogs SET CheckOutTime = ? WHERE EmployeeID = ? AND Date = ? AND CheckOutTime IS NULL',
//       [time, employeeID, date],
//       (err, results) => {
//           if (err) {
//               console.error('Error logging Check-Out:', err);
//               res.status(500).json({ error: 'Failed to log Check-Out' });
//           } else if (results.affectedRows === 0) {
//               console.error('No Check-In found for Check-Out');
//               res.status(400).json({ error: 'No Check-In found to Check-Out' });
//           } else {
//               console.log('Check-Out logged successfully');
//               res.sendStatus(200);
//           }
//       }
//   );
// });



// app.get('/api/logs', (req, res) => {
//   db.query('SELECT * FROM EmployeeLogs', (err, results) => {
//       if (err) {
//           console.error('Error fetching logs:', err);
//           res.status(500).json({ error: 'Failed to fetch logs' });
//       } else {
//           res.json(results);
//       }
//   });
// });



// Fetch all employees with their attendance details
app.get('/api/employees', (req, res) => {
  const query = `
    SELECT e.EmployeeID, e.Name, e.MobileNumber, e.Cat, 
           l.Date, l.CheckInTime, l.CheckOutTime 
    FROM employeedetails e
    LEFT JOIN employeelogs l ON e.EmployeeID = l.EmployeeID
    ORDER BY l.Date DESC, l.CheckInTime DESC;
  `;
  
  db.query(query, (err, results) => {
    if (err) return res.status(500).send(err);
    
    res.json(results);
  });
});

// Check-in an employee
app.post('/api/checkin/:employeeID', (req, res) => {
  const employeeID = req.params.employeeID;
  const checkInTime = new Date().toISOString().slice(0, 19).replace('T', ' '); // Current time
  const currentDate = new Date().toISOString().slice(0, 10); // Current date (YYYY-MM-DD)

  // Insert the check-in record for the current date
  const query = `
    INSERT INTO employeelogs (EmployeeID, Date, CheckInTime)
    VALUES (?, ?, ?);
  `;
  
  db.query(query, [employeeID, currentDate, checkInTime], (err, results) => {
    if (err) return res.status(500).send(err);
    
    res.send('Check-in successful');
  });
});

// Check-out an employee
app.post('/api/checkout/:employeeID', (req, res) => {
  const employeeID = req.params.employeeID;
  const checkOutTime = new Date().toISOString().slice(0, 19).replace('T', ' '); // Current time
  const currentDate = new Date().toISOString().slice(0, 10); // Current date (YYYY-MM-DD)

  // Update the check-out time for the current date
  const query = `
    UPDATE employeelogs 
    SET CheckOutTime = ?
    WHERE EmployeeID = ? AND Date = ? AND CheckOutTime IS NULL;
  `;
  
  db.query(query, [checkOutTime, employeeID, currentDate], (err, results) => {
    if (err) return res.status(500).send(err);
    
    res.send('Check-out successful');
  });
});




// app.post('/api/visitor-entry', async (req, res) => {
//   const { visitor_name, flat_number, purpose } = req.body;
//   const entry_datetime = new Date();  // Capture current time as entry datetime

//   const query = 'INSERT INTO visitorlogs (visitor_name, flat_number, entry_datetime, purpose, status) VALUES (?, ?, ?, ?, ?)';
//   db.query(query, [visitor_name, flat_number, entry_datetime, purpose, 'Inside'], (err, result) => {
//       if (err) {
//           console.error('Error inserting visitor entry:', err);
//           return res.status(500).json({ error: 'Failed to log visitor entry' });
//       }
//       res.status(200).json({ message: 'Visitor entry logged successfully' });
//   });
// });


// app.post('/api/visitor-exit', async (req, res) => {
//   const { visitor_log_id } = req.body;
//   const exit_datetime = new Date();  // Capture current time as exit datetime

//   const query = 'UPDATE visitorlogs SET exit_datetime = ?, status = ? WHERE visitor_log_id = ?';
//   db.query(query, [exit_datetime, 'Exited', visitor_log_id], (err, result) => {
//       if (err) {
//           console.error('Error updating visitor exit:', err);
//           return res.status(500).json({ error: 'Failed to update visitor exit' });
//       }
//       res.status(200).json({ message: 'Visitor exit updated successfully' });
//   });
// });


app.get('/api/visitor-logs', (req, res) => {
  const query = 'SELECT * FROM visitorlogs ORDER BY entry_datetime DESC';

  db.query(query, (err, rows) => {
      if (err) {
          console.error('Error fetching visitor logs:', err);
          return res.status(500).json({ error: 'Failed to fetch visitor logs' });
      }

      res.status(200).json({ logs: rows });
  });
});
// API Route for Visitor Entry
app.post('/api/visitor-entry', (req, res) => {
  const { visitor_name, flat_number, purpose } = req.body;

  if (!visitor_name || !flat_number || !purpose) {
      return res.status(400).json({ error: 'All fields are required' });
  }

  const entry_datetime = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const status = 'Inside';

  const query = `
      INSERT INTO visitorlogs (visitor_name, flat_number, entry_datetime, purpose, status)
      VALUES (?, ?, ?, ?, ?)
  `;

  db.query(query, [visitor_name, flat_number, entry_datetime, purpose, status], (err) => {
      if (err) {
          console.error('SQL Error:', err.sqlMessage);
          return res.status(500).json({ error: 'Database error', details: err.sqlMessage });
      }
      res.json({ message: 'Visitor entry logged successfully.' });
  });
});







// Get all flats and their bill status
app.get('/bills', (req, res) => {
  const query = 'SELECT * FROM flats';
  db.query(query, (err, results) => {
      if (err) {
          console.error('Error fetching data:', err);
          res.status(500).json({ message: 'Error fetching data.' });
      } else {
          res.json(results);
      }
  });
});

// Update bill status to "Paid"
app.post('/bills/update', (req, res) => {
  const { flat } = req.body;
  const query = `UPDATE flats SET bill_status = 'Paid' WHERE flat_number = ?`;

  db.query(query, [flat], (err, result) => {
      if (err) {
          console.error('Error updating data:', err);
          res.status(500).json({ message: 'Error updating data.' });
      } else if (result.affectedRows === 0) {
          res.status(404).json({ message: 'Flat not found.' });
      } else {
          res.json({ message: `Payment updated for Flat ${flat}.` });
      }
  });
});

// Reset all bill statuses to "Unpaid"
app.post('/bills/reset', (req, res) => {
  const query = `UPDATE flats SET bill_status = 'Unpaid'`;

  db.query(query, (err, result) => {
      if (err) {
          console.error('Error resetting data:', err);
          res.status(500).json({ message: 'Error resetting data.' });
      } else {
          res.json({ message: 'All bills reset to Unpaid.' });
      }
  });
});









// ...........................................................................................
//Security Dashboard
//Attendence

// Function to get current date in Indian Standard Time
// const getCurrentDate = () => {
//   return moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
// };

// // Function to get current time in Indian Standard Time
// const getCurrentTime = () => {
//   return moment().tz('Asia/Kolkata').format('HH:mm:ss');
// };

// // Middleware to Initialize Daily Logs
// app.use((req, res, next) => {
//   const today = getCurrentDate();

//   // Check if logs for today already exist
//   const checkLogsQuery = 'SELECT COUNT(*) AS count FROM EmployeeLogs WHERE Date = ?';
//   db.query(checkLogsQuery, [today], (err, results) => {
//       if (err) {
//           console.error('Error checking daily logs:', err);
//           return res.status(500).json({ error: 'Database error' });
//       }

//       if (results[0].count === 0) {
//           // Insert a log entry for each employee with NULL times
//           const insertLogsQuery = `
//               INSERT INTO EmployeeLogs (EmployeeID, Date, CheckInTime, CheckOutTime)
//               SELECT EmployeeID, ?, NULL, NULL FROM EmployeeDetails
//           `;
//           db.query(insertLogsQuery, [today], (err) => {
//               if (err) {
//                   console.error('Error initializing daily logs:', err);
//                   return res.status(500).json({ error: 'Database error' });
//               }
//               console.log('Daily logs initialized.');
//               next();
//           });
//       } else {
//           next();
//       }
//   });
// });

// // API Endpoint: Get All Employees with Today's Logs
// app.get('/api/employees', (req, res) => {
//   const today = getCurrentDate();
//   const query = `
//       SELECT 
//           e.EmployeeID, e.Name, e.MobileNumber, e.Category, 
//           l.Date, l.CheckInTime, l.CheckOutTime 
//       FROM EmployeeDetails e
//       LEFT JOIN EmployeeLogs l ON e.EmployeeID = l.EmployeeID AND l.Date = ?
//       ORDER BY e.EmployeeID ASC
//   `;
//   db.query(query, [today], (err, results) => {
//       if (err) {
//           console.error('Error fetching employees:', err);
//           return res.status(500).json({ error: 'Database error' });
//       }
//       res.json(results);
//   });
// });

// // API Endpoint: Check-In an Employee
// app.post('/api/checkin/:id', (req, res) => {
//   const employeeID = req.params.id;
//   const time = getCurrentTime();
//   const today = getCurrentDate();

//   const updateCheckInQuery = `
//       UPDATE EmployeeLogs 
//       SET CheckInTime = ? 
//       WHERE EmployeeID = ? AND Date = ?
//   `;

//   db.query(updateCheckInQuery, [time, employeeID, today], (err, results) => {
//       if (err) {
//           console.error('Error during Check-In:', err);
//           return res.status(500).json({ error: 'Database error' });
//       }

//       if (results.affectedRows === 0) {
//           return res.status(404).json({ error: 'Employee log not found for today.' });
//       }

//       res.json({ message: 'Check-In successful.' });
//   });
// });

// // API Endpoint: Check-Out an Employee
// app.post('/api/checkout/:id', (req, res) => {
//   const employeeID = req.params.id;
//   const time = getCurrentTime();
//   const today = getCurrentDate();

//   const updateCheckOutQuery = `
//       UPDATE EmployeeLogs 
//       SET CheckOutTime = ? 
//       WHERE EmployeeID = ? AND Date = ? AND CheckInTime IS NOT NULL AND CheckOutTime IS NULL
//   `;

//   db.query(updateCheckOutQuery, [time, employeeID, today], (err, results) => {
//       if (err) {
//           console.error('Error during Check-Out:', err);
//           return res.status(500).json({ error: 'Database error' });
//       }

//       if (results.affectedRows === 0) {
//           return res.status(400).json({ error: 'Check-Out failed. Either not checked in or already checked out.' });
//       }

//       res.json({ message: 'Check-Out successful.' });
//   });
// });





// Start the server
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
