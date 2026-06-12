# Playground

Self-contained sandbox folder. Tidak menyentuh kode utama Luxeni (indexer, API, frontend).

Berisi demo kecil "utility CSS" yang dibangun bertahap oleh `generate-activity.ps1`:
tiap commit menambah satu utility class + entri changelog + satu box di `index.html`.

## Jalankan

```powershell
# default: 20 PR x 5 commit = 100 commit, auto-merge ke main
powershell -ExecutionPolicy Bypass -File playground/generate-activity.ps1

# tanpa merge (PR dibiarkan terbuka)
powershell -ExecutionPolicy Bypass -File playground/generate-activity.ps1 -NoMerge

# atur jumlah
powershell -ExecutionPolicy Bypass -File playground/generate-activity.ps1 -PRCount 5 -CommitsPerPR 4
```

Butuh `git` + `gh` (sudah login) dan remote `origin`.
