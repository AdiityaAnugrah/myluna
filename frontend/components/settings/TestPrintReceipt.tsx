import React from 'react';

export const TestPrintReceipt = React.forwardRef<HTMLDivElement>((props, ref) => {
  return (
    <div ref={ref} className="p-8 bg-white text-black" style={{ width: '80mm', fontFamily: 'monospace' }}>
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-4 mb-4">
        <h1 className="text-2xl font-bold">LUNA SISTEM</h1>
        <p className="text-sm">Jl. Contoh No. 123, Jakarta</p>
        <p className="text-sm">Telp: (021) 1234-5678</p>
      </div>

      {/* Title */}
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold">RESI PENGIRIMAN</h2>
        <p className="text-xs">(TEST PRINT)</p>
      </div>

      {/* Sample Data */}
      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span>No. Resi:</span>
          <span className="font-bold">TEST-00001</span>
        </div>
        <div className="flex justify-between">
          <span>Tanggal:</span>
          <span>{new Date().toLocaleDateString('id-ID')}</span>
        </div>
        <div className="flex justify-between">
          <span>Waktu:</span>
          <span>{new Date().toLocaleTimeString('id-ID')}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t-2 border-dashed border-black my-4" />

      {/* Shipping Info */}
      <div className="space-y-3 text-sm mb-4">
        <div>
          <p className="font-bold">PENGIRIM:</p>
          <p>Luna Sistem</p>
          <p>Jakarta Pusat</p>
          <p>Telp: 0812-3456-7890</p>
        </div>

        <div>
          <p className="font-bold">PENERIMA:</p>
          <p>Customer Test</p>
          <p>Jl. Test No. 456</p>
          <p>Bandung, Jawa Barat</p>
          <p>Telp: 0813-9876-5432</p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t-2 border-dashed border-black my-4" />

      {/* Package Info */}
      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span>Layanan:</span>
          <span className="font-bold">Regular</span>
        </div>
        <div className="flex justify-between">
          <span>Berat:</span>
          <span>1.5 kg</span>
        </div>
        <div className="flex justify-between">
          <span>Jumlah Item:</span>
          <span>3 item</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">Total:</span>
          <span className="font-bold">Rp 125,000</span>
        </div>
      </div>

      {/* Barcode Representation */}
      <div className="text-center my-4">
        <div className="inline-block px-4 py-2 border-2 border-black">
          <p className="font-mono text-xs tracking-widest">||||| TEST-00001 |||||</p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-black pt-4 mt-4">
        <p className="text-center text-xs">Terima kasih atas kepercayaan Anda</p>
        <p className="text-center text-xs">system.lunarea.com</p>
        <p className="text-center text-xs font-bold mt-2">* TEST PRINT *</p>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-3 border border-black">
        <p className="text-xs text-center">
          Jika resi ini tercetak dengan baik,<br />
          printer WiFi Anda sudah terkonfigurasi!
        </p>
      </div>
    </div>
  );
});

TestPrintReceipt.displayName = 'TestPrintReceipt';
