const fs = require('fs');

const content = fs.readFileSync('page.tsx', 'utf-8');

const startMarker = '{/* ===== AREA CETAK (TERSEMBUNYI DI LAYAR, MUNCUL SAAT PRINT) ===== */}';
if (!content.includes(startMarker)) {
  console.log('Marker not found');
  process.exit(1);
}

const prefix = content.substring(0, content.indexOf(startMarker));

const newLayout = `{/* ===== AREA CETAK (TERSEMBUNYI DI LAYAR, MUNCUL SAAT PRINT) ===== */}
        <div className="absolute top-0 left-0 w-0 h-0 overflow-hidden opacity-0 pointer-events-none">
            <div ref={printRef} style={{ fontFamily: '"Arial", sans-serif', color: '#111', background: '#fff', minWidth: '210mm', padding: '0' }}>
                {printSale && (
                    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px', border: '2px solid #111' }}>

                        {/* ── HEADER TOKO ── */}
                        <div style={{ textAlign: 'center', borderBottom: '3px double #111', paddingBottom: '14px', marginBottom: '18px' }}>
                            <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '3px', textTransform: 'uppercase' }}>
                                ✦ LUNAREA FURNITURE OFFICIAL ✦
                            </div>
                            <div style={{ fontSize: '12px', marginTop: '4px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                DESA KEDUNGPANE, JL. RAYA BOJA, KEC. MIJEN, KOTA SEMARANG, JAWA TENGAH
                            </div>
                            <div style={{ fontSize: '12px', marginTop: '2px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                TELP: +62 811-2938-160
                            </div>
                        </div>

                        {/* ── LABEL RESI ── */}
                        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                            <span style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '4px', textTransform: 'uppercase', border: '1.5px solid #111', padding: '4px 20px', display: 'inline-block' }}>
                                RESI PENGIRIMAN
                            </span>
                        </div>

                        {/* ── NO. PESANAN & EKSPEDISI ── */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '12px', borderBottom: '1px solid #ccc', paddingBottom: '12px' }}>
                            <div>
                                <div style={{ color: '#555', letterSpacing: '1px', fontSize: '10px', textTransform: 'uppercase' }}>NO. PESANAN</div>
                                <div style={{ fontWeight: '800', fontSize: '14px', fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase' }}>{printSale.saleNumber}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#555', letterSpacing: '1px', fontSize: '10px', textTransform: 'uppercase' }}>JASA PENGIRIMAN</div>
                                <div style={{ fontWeight: '800', fontSize: '14px', textTransform: 'uppercase' }}>
                                    {printSale.shippingService?.replace(/_/g, ' ') || '-'}
                                </div>
                            </div>
                        </div>

                        {/* ── PENGIRIM & PENERIMA ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', marginBottom: '18px', border: '1.5px solid #111' }}>
                            {/* PENGIRIM */}
                            <div style={{ padding: '12px 14px', borderRight: '1.5px solid #111' }}>
                                <div style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase', color: '#444', marginBottom: '6px', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
                                    ▶ PENGIRIM
                                </div>
                                <div style={{ fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', marginBottom: '3px' }}>
                                    LUNAREA FURNITURE
                                </div>
                                <div style={{ fontSize: '11px', marginBottom: '2px', textTransform: 'uppercase' }}>TELP: +62 811-2938-160</div>
                                <div style={{ fontSize: '10px', lineHeight: '1.5', color: '#333', textTransform: 'uppercase' }}>
                                    DESA KEDUNGPANE, JL. RAYA BOJA<br/>KEC. MIJEN, SEMARANG, JATENG
                                </div>
                            </div>
                            {/* PENERIMA */}
                            <div style={{ padding: '12px 14px' }}>
                                <div style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase', color: '#444', marginBottom: '6px', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
                                    ▶ PENERIMA
                                </div>
                                <div style={{ fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', marginBottom: '3px' }}>
                                    {(printSale.customerName || 'PELANGGAN UMUM')}
                                </div>
                                <div style={{ fontSize: '11px', marginBottom: '2px', textTransform: 'uppercase' }}>
                                    TELP: {printSale.customerPhone || '-'}
                                </div>
                                <div style={{ fontSize: '10px', lineHeight: '1.5', color: '#333', textTransform: 'uppercase', whiteSpace: 'pre-wrap' }}>
                                    {(printSale.shippingAddress || 'ALAMAT TIDAK TERSEDIA')}
                                </div>
                            </div>
                        </div>

                        {/* ── DAFTAR BARANG ── */}
                        <div style={{ border: '1.5px solid #111', marginBottom: '14px' }}>
                            <div style={{ background: '#111', color: '#fff', padding: '6px 14px', fontSize: '11px', fontWeight: '800', letterSpacing: '3px', textTransform: 'uppercase' }}>
                                DAFTAR BARANG
                            </div>
                            <div style={{ padding: '0' }}>
                                {/* Header kolom */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0', borderBottom: '1px solid #ccc', padding: '6px 14px', fontSize: '10px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: '#555' }}>
                                    <span>NAMA BARANG / VARIAN</span>
                                    <span style={{ textAlign: 'right', marginRight: '4px' }}>JUMLAH</span>
                                </div>
                                {printSale.items?.map((item: any, idx: number) => {
                                    let productVariants: any[] = [];
                                    try {
                                        const raw = item.product?.variants;
                                        if (Array.isArray(raw)) productVariants = raw;
                                        else if (typeof raw === 'string') productVariants = JSON.parse(raw);
                                    } catch {}
                                    const hasProductVariants = productVariants.length > 0;
                                    const isLast = idx === (printSale.items?.length ?? 0) - 1;
                                    return (
                                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', padding: '8px 14px', borderBottom: isLast ? 'none' : '1px dashed #ddd', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    {(item.product?.name || 'PRODUK')}
                                                </div>
                                                {item.variantName ? (
                                                    <div style={{ fontSize: '11px', color: '#444', marginTop: '2px', fontStyle: 'italic', textTransform: 'uppercase' }}>
                                                        VARIAN: <strong>{item.variantName}</strong>
                                                    </div>
                                                ) : hasProductVariants ? (
                                                    <div style={{ fontSize: '10px', color: '#cc0000', marginTop: '2px', fontWeight: '700', textTransform: 'uppercase' }}>
                                                        &#9888; VARIAN TIDAK DIPILIH
                                                    </div>
                                                ) : null}
                                            </div>
                                            <div style={{ fontWeight: '800', fontSize: '16px', textAlign: 'right', minWidth: '48px', textTransform: 'uppercase' }}>
                                                X {item.quantity}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── CATATAN ── */}
                        {printSale.notes && (
                            <div style={{ border: '1px dashed #666', padding: '8px 14px', marginBottom: '14px', fontSize: '11px' }}>
                                <div style={{ fontWeight: '800', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#555', marginBottom: '4px' }}>CATATAN:</div>
                                <div style={{ textTransform: 'uppercase', whiteSpace: 'pre-wrap' }}>{(printSale.notes)}</div>
                            </div>
                        )}

                        {/* ── FOOTER ── */}
                        <div style={{ borderTop: '3px double #111', paddingTop: '10px', textAlign: 'center', fontSize: '10px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase' }}>
                            <div>TERIMA KASIH TELAH BERBELANJA DI LUNAREA FURNITURE</div>
                            <div style={{ marginTop: '3px' }}>BARANG YANG SUDAH DIBELI TIDAK DAPAT DIKEMBALIKAN KECUALI ADA KESEPAKATAN</div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
`;

fs.writeFileSync('page.tsx', prefix + newLayout);
console.log('Done');
