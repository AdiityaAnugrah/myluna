require('dotenv').config();
const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: 1, roleName: 'SUPER_ADMIN' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

async function apiCall(path, method, body) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`http://127.0.0.1:4000/api/v1${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function run() {
  try {
    console.log("1. Setting Saldo Awal to 3,000,000");
    await apiCall('/finance/initial-receivable', 'POST', { amount: 3000000 });
    
    console.log("2. Checking Summary before any new sales");
    const summary1 = await apiCall('/finance/summary', 'GET');
    console.log("Sisa Piutang Akhir:", summary1.data.summary.sisaPiutangAkhir);
    console.log("Carry Forward:", summary1.data.summary.carryForwardPiutang);
    
    console.log("3. Creating a dummy sale of 1,000,000");
    const saleRes = await apiCall('/sales', 'POST', {
      invoiceNumber: `INV-TEST-${Date.now()}`,
      saleDate: new Date().toISOString(),
      customerName: "Auto Test",
      customerPhone: "08123456789",
      paymentMethod: "CASH",
      platform: "OFFLINE STORE",
      shippingService: "REGULAR",
      items: [
        {
          productId: 1,
          variantId: null,
          quantity: 1,
          price: 1000000
        }
      ]
    });
    const saleId = saleRes.data.id;
    
    console.log("Processing dummy sale:", saleId);
    await apiCall(`/sales/${saleId}/status`, 'PUT', { status: "APPROVED" });
    await apiCall(`/sales/${saleId}/status`, 'PUT', { status: "PROCESSED" });
    
    console.log("4. Settling the sale for 1,000,000");
    await apiCall('/settlements', 'POST', {
      saleId: saleId,
      settlementDate: new Date().toISOString(),
      netAmount: 1000000,
      bankName: "BCA"
    });
    
    console.log("5. Checking Summary after settlement");
    const summary2 = await apiCall('/finance/summary', 'GET');
    console.log("Pendapatan Bersih (Dana Bersih):", summary2.data.summary.danaBersih);
    console.log("Sisa Piutang Akhir:", summary2.data.summary.sisaPiutangAkhir);
    console.log("Carry Forward (Piutang Bulan Lalu):", summary2.data.summary.carryForwardPiutang);

  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
