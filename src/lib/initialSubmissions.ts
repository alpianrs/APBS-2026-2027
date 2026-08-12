import { ApbsSubmission } from "../types";

export const INITIAL_SUBMISSIONS_SAMPLE: ApbsSubmission[] = [
  {
    id: "sub-1",
    itemId: "apbs-item-73", // Biaya Provider Sampah + THR Pengangkut Sampah
    monthNum: 7, // Juli
    nominalPengajuan: 1700000,
    nominalRealisasi: 1700000,
    tanggalPengajuan: "2026-07-10",
    tanggalLaporan: "2026-07-15",
    isReported: true,
    noSpkOrKwitansi: "KW-JUL-001",
    catatan: "Pengajuan rutin biaya kebersihan sampah Juli",
    submittedBy: "Tim Ops Cinere",
    purchaseItems: [
      {
        id: "pi-1",
        name: "Iuran Rutin Kebersihan & Retribusi Sampah Juli",
        qty: 1,
        unit: "Bulan",
        unitPrice: 1200000,
        totalPrice: 1200000
      },
      {
        id: "pi-2",
        name: "Tips & Kebersihan Pengangkut Sampah Lingkungan",
        qty: 2,
        unit: "Orang",
        unitPrice: 250000,
        totalPrice: 500000
      }
    ]
  },
  {
    id: "sub-2",
    itemId: "apbs-item-73", // Biaya Provider Sampah
    monthNum: 8, // Agustus
    nominalPengajuan: 1000000,
    nominalRealisasi: 0,
    tanggalPengajuan: "2026-08-05",
    isReported: false, // Belum Laporan / LPJ Pending
    noSpkOrKwitansi: "KW-AGU-012",
    catatan: "Pengajuan biaya kebersihan Agustus (Menunggu LPJ Laporan Pembelian)",
    submittedBy: "Tim Ops Cinere",
    purchaseItems: [
      {
        id: "pi-3",
        name: "Pembelian Kantong Plastik Sampah Besar Heavy Duty",
        qty: 10,
        unit: "Pack",
        unitPrice: 50000,
        totalPrice: 500000
      },
      {
        id: "pi-4",
        name: "Tong Sampah Pilah Organik / Anorganik 50L",
        qty: 2,
        unit: "Unit",
        unitPrice: 250000,
        totalPrice: 500000
      }
    ]
  },
  {
    id: "sub-3",
    itemId: "apbs-item-494", // Obeng Anti Listrik / Peralatan
    monthNum: 7, // Juli
    nominalPengajuan: 2250000,
    nominalRealisasi: 2500000,
    tanggalPengajuan: "2026-07-15",
    tanggalLaporan: "2026-07-20",
    isReported: true,
    noSpkOrKwitansi: "KW-JUL-088",
    catatan: "Mengajukan 2.25M, realisasi 2.5M -> Keterangan 'Di Luar APBS'",
    submittedBy: "Logistik Lazuardi",
    purchaseItems: [
      {
        id: "pi-5",
        name: "Set Obeng Insulated Anti-Listrik 1000V",
        qty: 5,
        unit: "Set",
        unitPrice: 350000,
        totalPrice: 1750000
      },
      {
        id: "pi-6",
        name: "Digital Multimeter & Tespen Heavy Duty",
        qty: 3,
        unit: "Unit",
        unitPrice: 250000,
        totalPrice: 750000
      }
    ]
  }
];

