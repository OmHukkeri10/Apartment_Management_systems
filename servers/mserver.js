const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
const PORT = 3000;

// Enable CORS for all origins
app.use(cors({
    origin: '*',
}));

// Body parser middleware
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/Akshaya_Garden_Apartment_Database', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});



// Flat Schema
const flatSchema = new mongoose.Schema({
    flat_number: String,
    owner_id: Number,
    is_owner_residing: Boolean,
    tenant_name: String,
    tenant_mobile: String,
    tenant_email: String,
    tenant_aadhaar_number: String,
});

const ownerSchema = new mongoose.Schema({
    owner_id: Number,
    name: String,
    mobile: String,
    email: String,
    aadhaar_number: String,
});

// Vehicle Schema (linked to vehicledetails collection)
const vehicleSchema = new mongoose.Schema({
    flat_number: String,
    vehicle_type: String,
    registration_number: String,
}, { collection: 'vehicledetails' });

// Family Schema (linked to familydetails collection)
const familySchema = new mongoose.Schema({
    flat_number: String,
    number_of_members: Number,
    male_count: Number,
    female_count: Number,
    child_count: Number,
}, { collection: 'familydetails' });

// Bill Logs Schema
const billLogsSchema = new mongoose.Schema({
    flat_number: String,
    status: { type: String, default: 'Unpaid' },
    date: String,
    time: String,
    utr_number: { type: String, default: null }, // New field added
});

billLogsSchema.statics.resetMonthlyBills = async function () {
    await this.updateMany({}, { status: 'Unpaid', date: null, time: null, utr_number: null });
};

// Exporting the model

// 


const visitorLogSchema = new mongoose.Schema({
    visitor_name: { type: String, required: true },
    flat_number: { type: String, required: true },
    purpose: { type: String, required: true },
    entry_datetime: { type: String, required: true },
    exit_datetime: { type: String },
    status: { type: String, default: 'Active' }
});

const Visitor = mongoose.model('visitorlogs', visitorLogSchema);
// Define the Vacancy schema and model
const vacancySchema = new mongoose.Schema({
    flat_number: String,
    no_of_days_to_be_vacant: Number,
    reason: String
});
// Complaint Record Schema
const complaintRecordSchema = new mongoose.Schema({
    flat_number: { type: String, required: true },
    complaint: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, default: 'pending' },
    date: { type: Date, default: Date.now }
});



// Schema and Model
// Define the Login schema and model
const loginSchema = new mongoose.Schema({
    mobile_number: String,
    password: String,
  });
  
  const Login = mongoose.model('Login', loginSchema, 'Login');

  const fLoginSchema = new mongoose.Schema({
    flat_number: String,
    mobile_number: String,
    password: String,
});

// Define the s_login schema
const sLoginSchema = new mongoose.Schema({
    mobile_number: String,
    password: String,
});

const SLogin = mongoose.model('SLogin', sLoginSchema,'s_login');

const FLogin = mongoose.model('FLogin', fLoginSchema,'f_login');

// Models



const ComplaintRecord = mongoose.model('ComplaintRecord', complaintRecordSchema);


const Vacancy = mongoose.model('Vacancy', vacancySchema);

// Model for Visitor Log
// Notice 'visitorlogs' collection

const BillLogs = mongoose.model('bills_logs', billLogsSchema);
const Flat = mongoose.model('Flat', flatSchema);
const Owner = mongoose.model('owner', ownerSchema);
const Vehicle = mongoose.model('Vehicle', vehicleSchema);
const Family = mongoose.model('Family', familySchema);

//////////////////////////////////////////////////////////////////////////////
// Employeee
// Schemas
const EmployeeSchema = new mongoose.Schema({
    EmployeeID: Number,
    Name: String,
    MobileNumber: String,
    Category: String
});

const LogSchema = new mongoose.Schema({
    EmployeeID: Number,
    Date: String,
    CheckInTime: Date,
    CheckOutTime: Date
});

// Models
const Employee = mongoose.model('employeedetails', EmployeeSchema);
const Log = mongoose.model('employeelogs', LogSchema);


// POST route for login validation
app.post('/login', async (req, res) => {
    const { mobile_number, password } = req.body;
  
    // Ensure mobile number and password are provided
    if (!mobile_number || !password) {
      return res.status(400).json({ success: false, message: 'Mobile number and password are required' });
    }
  
    // Clean the mobile number and password fields (trim and cast to string)
    const cleanedMobileNumber = String(mobile_number).trim();
    const cleanedPassword = String(password).trim();
  
    console.log("Received mobile_number:", cleanedMobileNumber);
    console.log("Received password:", cleanedPassword);
  
    try {
      // Log the query before executing it
      console.log("Querying MongoDB with:", { mobile_number: cleanedMobileNumber, password: cleanedPassword });
  
      // Search for the user in the database
      const user = await Login.findOne({
        mobile_number: cleanedMobileNumber,
        password: cleanedPassword
      });
  
      // Log the result from MongoDB
      console.log("Result from MongoDB:", user);
  
      if (user) {
        res.status(200).json({
          success: true,
          message: 'Login successful',
          user,
        });
      } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
  

// Endpoint for login validation
app.post('/f_login', async (req, res) => {
    const { mobile_number, password, flat_number } = req.body;

    if (!mobile_number || !password || !flat_number) {
        return res.status(400).json({ success: false, message: 'Mobile number, password, and flat number are required' });
    }

    try {
        // Validate the login credentials from the f_login collection
        const user = await FLogin.findOne({ flat_number, mobile_number, password });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Get flat details to decide whether to return owner or tenant details
        const flat = await Flat.findOne({ flat_number });
        if (!flat) {
            return res.status(404).json({ success: false, message: 'Flat not found' });
        }

        if (flat.is_owner_residing) {
            // If the owner is residing, return owner's name
            const owner = await Owner.findOne({ owner_id: flat.owner_id });
            
                res.status(200).json({
                    success: true,
                    name: owner.name,
                    mobile:owner.mobile,
                    email:owner.email,
                    is_owner_residing: true
                });
           
        } else {
            // If the tenant is residing, return tenant's name
                res.status(200).json({
                    success: true,
                    name: flat.tenant_name,
                    mobile:flat.tenant_mobile,
                    email:flat.tenant_email,
                    is_owner_residing: false
                });
            
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});



// Endpoint to handle login validation
app.post('/s_login', async (req, res) => {
    const { mobile_number, password } = req.body;

    if (!mobile_number || !password) {
        return res.status(400).json({ success: false, message: 'Mobile number and password are required' });
    }

    try {
        // Validate the login credentials from s_login collection
        const user = await SLogin.findOne({ mobile_number, password });

        if (user) {
            res.status(200).json({
                success: true,
                message: 'Login successful',
                name: `Student with Mobile Number: ${mobile_number}`, // or any other name field if needed
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Endpoint to fetch all flat numbers
app.get('/getFlatNumbers', async (req, res) => {
    try {
        const flats = await Flat.find({}, { flat_number: 1, _id: 0 });
        const flatNumbers = flats.map(flat => flat.flat_number);
        res.json({ success: true, flat_numbers: flatNumbers });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal server error!' });
    }
});


// Endpoint to fetch flat details by flat number
app.get('/getFlatDetails/:flat_number', async (req, res) => {
    const flatNumber = req.params.flat_number;

    try {
        // Fetch flat details
        const flat = await Flat.findOne({ flat_number: flatNumber });
        if (!flat) {
            return res.json({ success: false, message: 'Flat not found!' });
        }

        // Fetch vehicle details
        const vehicles = await Vehicle.find({ flat_number: flatNumber });

        // Fetch family details
        const family = await Family.findOne({ flat_number: flatNumber });

        res.json({
            success: true,
            flat_details: {
                flat_number: flat.flat_number,
                owner_id: flat.owner_id,
                owner_name: `Owner ${flat.owner_id}`, // Placeholder for owner name
                tenant_name: flat.tenant_name || 'N/A',
                tenant_mobile: flat.tenant_mobile || 'N/A',
                tenant_email: flat.tenant_email || 'N/A',
                tenant_aadhaar_number: flat.tenant_aadhaar_number || 'N/A',
                vehicles: vehicles.map(vehicle => ({
                    vehicle_type: vehicle.vehicle_type,
                    registration_number: vehicle.registration_number,
                })),
                family: family || {
                    number_of_members: 0,
                    male_count: 0,
                    female_count: 0,
                    child_count: 0,
                },
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal server error!' });
    }
});




// Endpoint to search for a vehicle by registration number
app.get('/searchVehicle/:registration_number', async (req, res) => {
    const registrationNumber = req.params.registration_number;

    try {
        // Check if the vehicle exists in your apartment
        const vehicle = await Vehicle.findOne({ registration_number: registrationNumber });
        if (vehicle) {
            const flatDetails = await Flat.findOne({ flat_number: vehicle.flat_number });
            const familyDetails = await Family.findOne({ flat_number: vehicle.flat_number });

            return res.json({
                success: true,
                is_from_apartment: true,
                vehicle: {
                    flat_number: vehicle.flat_number,
                    vehicle_type: vehicle.vehicle_type,
                    registration_number: vehicle.registration_number,
                },
                flat_details: flatDetails || { message: 'Flat details not found.' },
                family_details: familyDetails || { message: 'Family details not found.' },
            });
        }

        // Vehicle not found in your apartment
        res.json({
            success: true,
            is_from_apartment: false,
            message: 'Vehicle does not belong to your apartment.',
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal server error!' });
    }
});


app.post('/markBillAsPaid', async (req, res) => {
    const { flat_number, utr_number } = req.body;

    // Validation for flat number
    if (!/^[A-J](10|[1-9])$/.test(flat_number)) {
        return res.status(400).json({
            success: false,
            message: `Flat number "${flat_number}" is invalid. Valid flat numbers start with A-J and are followed by 1-10.`,
        });
    }

    // Validation for UTR number
    if (!/^\d{12}$/.test(utr_number)) {
        return res.status(400).json({
            success: false,
            message: 'UTR number must be a 12-digit numeric value.',
        });
    }

    try {
        const existingBill = await BillLogs.findOne({ flat_number, status: 'Paid' });
        if (existingBill) {
            return res.json({ success: false, message: 'Bill is already marked as paid for this flat number.' });
        }

        const updatedBill = await BillLogs.findOneAndUpdate(
            { flat_number, status: 'Unpaid' },
            {
                status: 'Paid',
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString(),
                utr_number,
            },
            { new: true }
        );

        if (!updatedBill) {
            return res.json({ success: false, message: 'No unpaid bill found for the given flat number!' });
        }

        res.json({ success: true, message: 'Bill marked as paid successfully!', updatedBill });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal server error!' });
    }
});



// Endpoint to fetch bill logs by status
app.get('/getBillLogs/:status', async (req, res) => {
    const { status } = req.params;

    if (!['Paid', 'Unpaid'].includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid status! Use "Paid" or "Unpaid".',
        });
    }

    try {
        const bills = await BillLogs.find({ status });

        if (!bills.length) {
            return res.json({ success: false, message: `No bills found with status "${status}".` });
        }

        res.json({
            success: true,
            bills: bills.map(bill => ({
                bill_id: bill._id,
                flat_number: bill.flat_number,
                status: bill.status,
                date: bill.date || 'N/A',
                time: bill.time || 'N/A',
                utr_number: bill.utr_number || 'N/A',
            })),
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching bill logs' });
    }
});



// Endpoint to fetch all visitor logs
app.get('/getVisitorLogs', async (req, res) => {
    try {
        // Fetch all visitor logs from the 'visitorlogs' collection
        const visitorLogs = await visitorLog.find();

        if (visitorLogs.length === 0) {
            return res.json({ success: false, message: 'No visitor logs found.' });
        }

        res.json({
            success: true,
            visitor_logs: visitorLogs,
        });
    } catch (err) {
        console.error('Error fetching visitor logs:', err); // Log the error
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});



app.get('/api/visitors', async (req, res) => {
    try {
        const visitors = await Visitor.find().sort({ entry_datetime: -1 });
        res.json(visitors);
    } catch (error) {
        console.error('Error fetching visitors:', error);
        res.status(500).json({ error: 'Failed to fetch visitors' });
    }
});

app.get('/api/visitors/date/:date', async (req, res) => {
    try {
        const dateStr = req.params.date;
        const startDate = new Date(dateStr);
        const endDate = new Date(dateStr);
        endDate.setDate(endDate.getDate() + 1);

        const visitors = await Visitor.find({
            entry_datetime: {
                $gte: startDate.toISOString(),
                $lt: endDate.toISOString()
            }
        }).sort({ entry_datetime: -1 });

        res.json(visitors);
    } catch (error) {
        console.error('Error fetching visitors by date:', error);
        res.status(500).json({ error: 'Failed to fetch visitors' });
    }
});

app.post('/api/visitors', async (req, res) => {
    try {
        const visitor = new Visitor(req.body);
        await visitor.save();
        res.status(201).json(visitor);
    } catch (error) {
        console.error('Error creating visitor:', error);
        res.status(400).json({ error: 'Failed to create visitor' });
    }
});

app.put('/api/visitors/checkout/:id', async (req, res) => {
    try {
        const visitor = await Visitor.findByIdAndUpdate(
            req.params.id,
            {
                exit_datetime: req.body.exit_datetime,
                status: 'Completed'
            },
            { new: true }
        );

        if (!visitor) {
            return res.status(404).json({ error: 'Visitor not found' });
        }

        res.json(visitor);
    } catch (error) {
        console.error('Error checking out visitor:', error);
        res.status(500).json({ error: 'Failed to check out visitor' });
    }
});



// Endpoint to get all vacancies
app.get('/api/vacancies', async (req, res) => {
    try {
        const vacancies = await Vacancy.find();
        res.json(vacancies);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch vacancies' });
    }
});

// Endpoint to add a new vacancy
app.post('/api/vacancies', async (req, res) => {
    const { flat_number, no_of_days_to_be_vacant, reason } = req.body;

    if (!flat_number || !no_of_days_to_be_vacant || !reason) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const newVacancy = new Vacancy({
        flat_number,
        no_of_days_to_be_vacant,
        reason
    });

    try {
        await newVacancy.save();
        res.status(201).json({ message: 'Vacancy added successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add vacancy' });
    }
});

// Endpoint to delete a vacancy
app.delete('/api/vacancies/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const deletedVacancy = await Vacancy.findByIdAndDelete(id);

        if (!deletedVacancy) {
            return res.status(404).json({ error: 'Vacancy not found' });
        }

        res.json({ message: 'Vacancy deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete vacancy' });
    }
});



// Fetch all complaint records
app.get('/api/complaint-records', async (req, res) => {
    try {
        const records = await ComplaintRecord.find(); // Fetch all complaint records
        res.json(records); // Return records as JSON
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch complaint records' });
    }
});

// Add a new complaint record
app.post('/api/complaint-records', async (req, res) => {
    const { flat_number, complaint, description } = req.body;

    if (!flat_number || !complaint || !description) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const newRecord = new ComplaintRecord({
        flat_number,
        complaint,
        description
    });

    try {
        await newRecord.save();
        res.status(201).json({ message: 'Complaint record added successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add complaint record' });
    }
});

// Update status of a complaint record
app.put('/api/complaint-records/:id/status', async (req, res) => {
    const { id } = req.params;

    try {
        // Find the complaint record by ID and update the status
        const updatedRecord = await ComplaintRecord.findByIdAndUpdate(
            id,
            { status: 'completed' }, // Update status to 'completed'
            { new: true } // Return the updated document
        );

        if (!updatedRecord) {
            return res.status(404).json({ error: 'Complaint record not found' });
        }

        res.json({ message: 'Status updated successfully', record: updatedRecord });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update status' });
    }
});


// Routes
app.get('/api/employees', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const employees = await Employee.find();
        
        // Get today's logs for all employees
        const logs = await Log.find({
            Date: today,
            EmployeeID: { $in: employees.map(e => e.EmployeeID) }
        });

        // Map logs to employees
        const employeesWithLogs = employees.map(emp => {
            const todayLog = logs.find(log => log.EmployeeID === emp.EmployeeID);
            return {
                ...emp.toObject(),
                todayLog
            };
        });

        res.json(employeesWithLogs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/checkin', async (req, res) => {
    try {
        const { EmployeeID } = req.body;
        const today = new Date().toISOString().split('T')[0];

        const existingLog = await Log.findOne({
            EmployeeID,
            Date: today
        });

        if (existingLog && existingLog.CheckInTime) {
            return res.status(400).json({ message: 'Already checked in today' });
        }

        if (existingLog) {
            existingLog.CheckInTime = new Date();
            await existingLog.save();
        } else {
            await Log.create({
                EmployeeID,
                Date: today,
                CheckInTime: new Date()
            });
        }

        res.json({ message: 'Check-in successful' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/checkout', async (req, res) => {
    try {
        const { EmployeeID } = req.body;
        const today = new Date().toISOString().split('T')[0];

        const log = await Log.findOne({
            EmployeeID,
            Date: today
        });

        if (!log || !log.CheckInTime) {
            return res.status(400).json({ message: 'Must check in before checking out' });
        }

        if (log.CheckOutTime) {
            return res.status(400).json({ message: 'Already checked out today' });
        }

        log.CheckOutTime = new Date();
        await log.save();

        res.json({ message: 'Check-out successful' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
/////////////////////////////////////////////////////////////////////////////////////////////
// PResident attendence view

// Get all employees
app.get('/api/employees', async (req, res) => {
    try {
        const employees = await Employee.find().sort('Name');
        res.json(employees);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get logs by date
app.get('/api/logs/date/:date', async (req, res) => {
    try {
        const logs = await Log.find({ Date: req.params.date });
        const employeeIds = logs.map(log => log.EmployeeID);
        const employees = await Employee.find({ EmployeeID: { $in: employeeIds } });

        const logsWithDetails = logs.map(log => ({
            ...log.toObject(),
            employee: employees.find(emp => emp.EmployeeID === log.EmployeeID)
        }));

        res.json(logsWithDetails);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get logs by employee
app.get('/api/logs/employee/:employeeId', async (req, res) => {
    try {
        const logs = await Log.find({ EmployeeID: req.params.employeeId })
            .sort('-Date');
        const employee = await Employee.findOne({ EmployeeID: req.params.employeeId });

        const logsWithDetails = logs.map(log => ({
            ...log.toObject(),
            employee
        }));

        res.json(logsWithDetails);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
///////////////////////////////////////////////////////////////////////////////////////////
// //Email Message sending
// const nodemailer = require('nodemailer');

// // Step 1: Configure the transporter
// const transporter = nodemailer.createTransport({
//     service: 'gmail', // Use Gmail or any other email service
//     auth: {
//         user: '01fe22bcs259@kletech.ac.in', // Your email
//         pass: 'swzk lukh byrh xema', // Your email app password
//     },
// });

// // Step 2: Email sending function
// const sendReminderEmail = () => {
//     const mailOptions = {
//         from: '01fe22bcs259@kletech.ac.in', // Sender address
//         to: ['01fe22bcs236@kletech.ac.in', '01fe22bcs239@kletech.ac.in'], // Recipients
//         subject: 'Monthly Reminder',
//         text: 'Please Pay the maintenance Bill...!!!.',
//     };

//     transporter.sendMail(mailOptions, (err, info) => {
//         if (err) {
//             console.error('Error sending email:', err);
//         } else {
//             console.log('Email sent successfully:', info.response);
//         }
//     });
// };

// // Step 3: Send email every 10 seconds
// setInterval(sendReminderEmail, 10000); // 10000 milliseconds = 10 seconds

// const nodemailer = require('nodemailer');
// const { MongoClient } = require('mongodb');

// // MongoDB connection setup
// const mongoUri = 'mongodb://127.0.0.1:27017'; // Replace with your MongoDB URI
// const dbName = 'Akshaya_Garden_Apartment_Database'; // Replace with your database name
// const client = new MongoClient(mongoUri);

// // Step 1: Configure the transporter
// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: '01fe22bcs259@kletech.ac.in', // Your email
//         pass: 'swzk lukh byrh xema', // Your email app password
//     },
// });

// // Step 2: Email sending function
// const sendReminderEmails = async () => {
//     try {
//         // Connect to MongoDB
//         await client.connect();
//         const db = client.db(dbName);

//         // Collections
//         const flatsCollection = db.collection('flats');
//         const ownersCollection = db.collection('owner');
//         const billLogsCollection = db.collection('bills_logs');

//         // Fetch flats with unpaid bills
//         const unpaidBills = await billLogsCollection.find({ status: 'Unpaid' }).toArray();

//         for (const bill of unpaidBills) {
//             const flat = await flatsCollection.findOne({ flat_number: bill.flat_number });

//             if (flat) {
//                 // Determine email recipients
//                 const emails = [];

//                 // Add tenant email if the tenant is residing
//                 if (!flat.is_owner_residing && flat.tenant_email) {
//                     emails.push(flat.tenant_email);
//                 }

//                 // Add owner email
//                 const owner = await ownersCollection.findOne({ owner_id: flat.owner_id });
//                 if (owner && owner.email) {
//                     emails.push(owner.email);
//                 }

//                 // Send email if there are any recipients
//                 if (emails.length > 0) {
//                     const mailOptions = {
//                         from: '01fe22bcs259@kletech.ac.in', // Sender address
//                         to: emails, // Recipients
//                         subject: `Maintenance Fee Reminder for Flat ${bill.flat_number}`,
//                         text: `Dear Resident/Owner,\n\nThis is a friendly reminder to pay the outstanding maintenance fees for Flat ${bill.flat_number}.\n\nDue Date: ${bill.date}\n\nThank you for your prompt attention to this matter.\n\nBest Regards,\nApartment Management Team`,
//                     };

//                     transporter.sendMail(mailOptions, (err, info) => {
//                         if (err) {
//                             console.error(`Error sending email for Flat ${bill.flat_number}:`, err);
//                         } else {
//                             console.log(`Email sent successfully for Flat ${bill.flat_number}:`, info.response);
//                         }
//                     });
//                 }
//             }
//         }
//     } catch (error) {
//         console.error('Error during email reminder process:', error);
//     } finally {
//         // Close MongoDB connection
//         await client.close();
//     }
// };

// // Step 3: Send emails every day (adjust timing as needed)
// // setInterval(sendReminderEmails, 10000); // 24 hours in milliseconds
const nodemailer = require('nodemailer');
const { MongoClient } = require('mongodb');

// MongoDB connection setup
const mongoUri = 'mongodb://127.0.0.1:27017'; // Replace with your MongoDB URI
const dbName = 'Akshaya_Garden_Apartment_Database'; // Replace with your database name
let client;

// Step 1: Configure the transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: '01fe22bcs259@kletech.ac.in', // Your email
        pass: 'swzk lukh byrh xema', // Your email app password
    },
});

// Step 2: Email sending function
const sendReminderEmails = async () => {
    try {
        // Initialize MongoDB client if not already connected
        if (!client) {
            client = new MongoClient(mongoUri, { useUnifiedTopology: true });
            await client.connect();
            console.log('Connected to MongoDB');
        }

        const db = client.db(dbName);

        // Collections
        const flatsCollection = db.collection('flats');
        const ownersCollection = db.collection('owner');
        const billLogsCollection = db.collection('bills_logs');

        console.log('Fetching unpaid bills...');
        // Fetch flats with unpaid bills
        const unpaidBills = await billLogsCollection.find({ status: 'Unpaid' }).toArray();

        if (unpaidBills.length === 0) {
            console.log('No unpaid bills found.');
            return;
        }

        console.log(`Found ${unpaidBills.length} unpaid bills.`);

        for (const bill of unpaidBills) {
            console.log(`Processing bill for flat: ${bill.flat_number}`);
            const flat = await flatsCollection.findOne({ flat_number: bill.flat_number });

            if (!flat) {
                console.error(`Flat not found for flat_number: ${bill.flat_number}`);
                continue;
            }

            // Determine email recipients
            const emails = [];

            // Add tenant email if tenant is residing
            if (!flat.is_owner_residing && flat.tenant_email) {
                emails.push(flat.tenant_email);
                console.log(`Added tenant email: ${flat.tenant_email}`);
            }

            // Add owner email
            const owner = await ownersCollection.findOne({ owner_id: flat.owner_id });
            if (owner && owner.email) {
                emails.push(owner.email);
                console.log(`Added owner email: ${owner.email}`);
            }

            if (emails.length === 0) {
                console.log(`No email recipients for flat ${bill.flat_number}`);
                continue;
            }

            // Send email
            const mailOptions = {
                from: '01fe22bcs259@kletech.ac.in',
                to: emails.join(', '),
                subject: `Maintenance Fee Reminder for Flat ${bill.flat_number}`,
                text: `Dear Resident/Owner,\n\nThis is a friendly reminder to pay the outstanding maintenance fees for Flat ${bill.flat_number}.\n\nDue Date: ${bill.date}\n\nThank you for your prompt attention to this matter.\n\nBest Regards,\nApartment Management Team`,
            };

            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.error(`Error sending email for Flat ${bill.flat_number}:`, err);
                } else {
                    console.log(`Email sent successfully for Flat ${bill.flat_number}:`, info.response);
                }
            });
        }
    } catch (error) {
        console.error('Error during email reminder process:', error);
    }
};

// Step 3: Send emails every 10 seconds for testing purposes
setInterval(sendReminderEmails, 10000); // 10 seconds interval


