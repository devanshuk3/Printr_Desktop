import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

// Mock database
let vendors = [
  { vendor_id: 'vn1003', password: '1234', full_name: 'Devanshu K', shop_name: 'Printr Demo' }
];

let printJobs = [
  { 
    id: 1, 
    file_name: 'sample_document.pdf', 
    file_key: 'sample-key-1', 
    sender_name: 'John Doe', 
    page_count: 5, 
    status: 'Pending' 
  },
  { 
    id: 2, 
    file_name: 'invoice_march.pdf', 
    file_key: 'invoice-key-2', 
    sender_name: 'Jane Smith', 
    page_count: 2, 
    status: 'Pending' 
  }
];

// Auth Routes
app.post('/api/login', (req, res) => {
  const { vendor_id, password } = req.body;
  const vendor = vendors.find(v => v.vendor_id === vendor_id && v.password === password);
  
  if (vendor) {
    res.json({
      success: true,
      message: "Authenticated",
      token: "demo-token-" + Date.now(),
      vendor_id: vendor.vendor_id
    });
  } else {
    res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }
});

app.post('/api/register', (req, res) => {
  const vendorData = req.body;
  vendors.push(vendorData);
  res.status(201).json({
    success: true,
    message: "Registered successfully",
    token: "demo-token-" + Date.now(),
    vendor_id: vendorData.vendor_id
  });
});

// Print Queue Routes (R2 Mocks)
app.get('/api/r2/files', (req, res) => {
  res.json({
    success: true,
    files: printJobs
  });
});

app.post('/api/r2/download', (req, res) => {
  const { file_key, id } = req.body;
  // In a real app, this would generate a signed URL from Cloudflare R2
  res.json({
    success: true,
    downloadUrl: `https://pub-demo-link.r2.dev/${file_key}?t=${Date.now()}`
  });
});

app.post('/api/r2/printed', (req, res) => {
  const { id } = req.body;
  const job = printJobs.find(j => j.id === id);
  if (job) {
    job.status = 'Printed';
    res.json({ success: true, message: "Marked as printed" });
  } else {
    res.status(404).json({ success: false, message: "Job not found" });
  }
});

app.post('/api/r2/delete', (req, res) => {
  const { id } = req.body;
  printJobs = printJobs.filter(j => j.id !== id);
  res.json({ success: true, message: "Job deleted" });
});

app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    stats: {
      total_prints: printJobs.filter(j => j.status === 'Printed').length + 1250,
      active_printers: 2,
      today_revenue: (printJobs.filter(j => j.status === 'Printed').length * 5) + 450.00
    }
  });
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
