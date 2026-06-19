# Master Wilayah Indonesia v2

Data di folder ini disalin dari:

- Repository: https://github.com/vermaysha/database-wilayah-indonesia
- Commit: `d2fb1c8163f5900b609eba96864f04d78aa049e5`
- Commit date: 2026-06-11
- License: MIT, lihat `LICENSE`

Repository tersebut menghasilkan CSV dari:

- https://github.com/cahyadsn/wilayah
- https://github.com/cahyadsn/wilayah_kodepos

Data administrasi pada sumber mengacu pada Kepmendagri No.
300.2.2-2430 Tahun 2025. Data kode pos tetap merupakan dataset komunitas dan
bukan publikasi resmi massal dari Pos Indonesia.

## Audit Sebelum Impor

| Tingkat | Jumlah |
| --- | ---: |
| Provinsi | 38 |
| Kabupaten/Kota | 514 |
| Kecamatan | 7.285 |
| Desa/Kelurahan | 83.762 |
| Kode pos unik | 10.632 |

Hasil pemeriksaan lokal:

- Tidak ada kode pos kosong atau selain lima digit.
- Tidak ada `village_id` duplikat.
- Tidak ada kode pos yang muncul lintas provinsi.
- Kode pos `11140` hanya menunjuk Krukut, Taman Sari, Kota Administrasi
  Jakarta Barat, DKI Jakarta; hasil ini cocok dengan pencarian Pos Indonesia
  pada 2026-06-19.

## SHA-256

```text
01province.csv 52DEB3C9BCF74E372823DEB079CDF0D00CBE0B89E923C51B17F9D6C4A788C3AB
02regency.csv  B457CE97EF43F5A8EE401BD97D067752CB88F83F7142823580A3A34394B9B459
03district.csv E60740376ACF714A973BCCE0518458CAA3356F3E80C4D9B0D76B9D941010768A
04village.csv  8597FD5ACDCDAFA9DFFDC7B713202416704BBF09A98E1061B4BBA8FE62EB0ABE
```
