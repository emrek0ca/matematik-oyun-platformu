# Asset Kaynakları ve Lisans Bilgileri (Asset Credits)

Bu proje, üniversite matematik eğitimi kapsamında geliştirilen profesyonel bir web oyun platformudur.
Projeye dahil edilen tüm 3D modeller ve harici varlıklar açık kaynaklı, kullanıma uygun lisanslara sahiptir.

---

## 1. 3D Modeller (GLB / GLTF)

| Dosya Adı | Açıklama | Kaynak | Lisans | Telif / Yazar |
|-----------|----------|--------|--------|---------------|
| `table.glb` | Ahşap Çalışma Masası | [Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit) | CC0 1.0 Universal (Public Domain) | Kenney ([kenney.nl](https://kenney.nl)) |
| `tableRound.glb` | Yuvarlak Masa | [Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit) | CC0 1.0 Universal (Public Domain) | Kenney ([kenney.nl](https://kenney.nl)) |
| `crate.glb` | Bilinmeyen Değer Kutusu (x) | [Kenney Prototype Kit](https://kenney.nl/assets/prototype-kit) | CC0 1.0 Universal (Public Domain) | Kenney ([kenney.nl](https://kenney.nl)) |
| `coin.glb` | NIM Oyun Parası / Jetonu | [Kenney Prototype Kit](https://kenney.nl/assets/prototype-kit) | CC0 1.0 Universal (Public Domain) | Kenney ([kenney.nl](https://kenney.nl)) |
| `figurine.glb` | Oyun Taş Figürü | [Kenney Prototype Kit](https://kenney.nl/assets/prototype-kit) | CC0 1.0 Universal (Public Domain) | Kenney ([kenney.nl](https://kenney.nl)) |
| `pie.glb` | Kesir Pastası / Turtası | [Kenney Food Kit](https://kenney.nl/assets/food-kit) | CC0 1.0 Universal (Public Domain) | Kenney ([kenney.nl](https://kenney.nl)) |
| `pizza.glb` | Kesir Pizzası | [Kenney Food Kit](https://kenney.nl/assets/food-kit) | CC0 1.0 Universal (Public Domain) | Kenney ([kenney.nl](https://kenney.nl)) |

---

## 2. Tipografi ve Yazı Tipleri

| Yazı Tipi | Kullanım Amacı | Kaynak | Lisans |
|-----------|----------------|--------|--------|
| **Inter** | Temel arayüz ve gövde metinleri | Google Fonts / Rasmus Andersson | SIL Open Font License 1.1 |
| **Space Grotesk** | Başlıklar ve ekran tipografisi | Google Fonts / Florian Karsten | SIL Open Font License 1.1 |
| **JetBrains Mono** | Matematiksel gösterimler, denklem ve AST | JetBrains / Google Fonts | Apache 2.0 License |

---

## 3. Ses Efektleri (Synthesized Audio)

- Web Audio API (dahili tarayıcı sentezleyicisi - sıfır harici dosya bağımlılığı, dinamik frekans ve kazanç eğrileriyle üretilmiştir).
- Herhangi bir telifli harici ses dosyası içermez.

---

## 4. Matematik ve Fizik Motorları

- **Cebir Terazisi Motoru:** Özgün saf TypeScript sembolik denklem çözücü, tam sayı aritmetiği ve Öklid EBOB sadeleştirme.
- **Kesir Atölyesi Motoru:** Kayan nokta hatasız rasyonel kesir cebiri, EBOB/EKOK algoritmaları, çapraz çarpım karşılaştırma.
- **24 Oyunu Motoru:** Özyinelemeli geriye izleme (Recursive Backtracking DFS) ile tam AST ağacı, rasyonel sayı değerlendirici.
- **NIM Motoru:** Charles Bouton 1901 kombinatorik oyun teorisi optimal XOR (Nim-sum) strateji motoru.
