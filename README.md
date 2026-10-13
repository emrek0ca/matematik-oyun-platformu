# 🎓 Matematik Oyun Platformu (Math Games Platform)

Üniversite matematik eğitimi ve pedagojik öğrenme hedefleri doğrultusunda geliştirilmiş, yüksek görsel kaliteli, matematiksel olarak doğrulanmış, tamamen oynanabilir dört farklı matematik oyununu barındıran profesyonel web oyun platformudur.

![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)
![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)
![Three.js](https://img.shields.io/badge/Three.js-0.177-black?logo=three.js)
![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)
![Vitest](https://img.shields.io/badge/Vitest-3.1-729B1B?logo=vitest)
![Tests](https://img.shields.io/badge/Tests-94%20Passed-success)

---

## 📌 Projenin Amacı

Bu platform, soyut matematik kavramlarını (cebirsel eşitlik, rasyonel kesir cebiri, işlem önceliği ve kombinatorik oyun teorisi) görsel ve somut etkileşimli modellerle öğretmeyi amaçlar:

1. **Cebir Terazisi:** Eşitlik ve denklem kavramlarının iki taraflı korunumu ilkesini somut bir fiziksel terazi metaforu ve sembolik cebir motoruyla öğretir.
2. **Kesir Atölyesi:** Kesirlerin parçadan bütüne oranını, eşdeğerliğini, sayı doğrusundaki metrik konumunu ve çapraz çarpım karşılaştırmasını kayan nokta hatası olmadan tam sayı aritmetiğiyle öğretir.
3. **24 Oyunu:** Aritmetik akıcılığı, işlem önceliğini ve parantezli cebirsel ifade ağaçlarını (AST) geriye izlemeli rasyonel sayılar motoruyla kazandırır.
4. **NIM:** İkili sayı tabanını (binary), bit düzeyinde XOR (Nim-sum) işlemini ve kombinatorik oyun teorisinde kayıpsız optimal strateji analizini öğretir.

---

## 🛠️ Kullanılan Teknolojiler ve Mimari

- **Frontend & Reaktivite:** React 18, TypeScript 5.8
- **Derleme & Paketleme:** Vite 6, Code Splitting (`React.lazy`, `Suspense`, Rollup `manualChunks`)
- **3D Grafik & Modelleme:** Three.js 0.177, `@react-three/fiber`, `@react-three/drei`
- **Animasyon & Arayüz:** Framer Motion 11, Tailwind CSS 3.4
- **Durum Yönetimi & İlerleme:** Zustand 5 (`localStorage` kalıcılığı ile seviye, puan ve istatistik takibi)
- **Ses Sistemi:** Web Audio API (tarayıcı içi sıfır gecikmeli parametrik ses sentezleme)
- **Test Çerçevesi:** Vitest 3, JSDOM, `@testing-library/jest-dom`

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- Node.js >= 18.0.0
- npm >= 9.0.0

### 1. Bağımlılıkları Yükleme
```bash
npm install
```

### 2. Geliştirme Sunucusunu Başlatma
```bash
npm run dev
```
Uygulama varsayılan olarak `http://localhost:5173` adresinde açılır.

### 3. Testleri Çalıştırma
```bash
npm run test
```

### 4. Üretim Derlemesi (Production Build)
```bash
npm run build
npm run preview
```

---

## 🎮 Oyun Kuralları ve Matematiksel Kazanımlar

### 1. Cebir Terazisi (Algebra Balance)
- **Kural:** Verilen $ax + b = cx + d$ denklemini çözmek için terazinin her iki tarafına daima eşit işlemler uygulanır.
- **Mekanik:** 
  - İki taraftan eşit miktar çıkarma ($-k$)
  - İki tarafa eşit miktar ekleme ($+k$)
  - İki tarafı aynı sayıya bölme ($\div k$)
  - İki tarafı aynı sayıyla çarpma ($\times k$)
- **Görsel:** Gerçek 3D denge terazisi modeli, bilinmeyen kutular (`crate.glb`), pirinç ağırlıklar ve yaylanmalı fiziksel salınım.
- **Kazanım:** Cebirsel denklik, denklem çözme adımları, ters işlem mantığı.

### 2. Kesir Atölyesi (Fraction Workshop)
- **Modlar:**
  1. *Kesir Daireleri:* 3D pasta ve dilimlerle hedef kesri oluşturma.
  2. *Eşdeğer Kesirler:* Genişletme ve sadeleştirme ile denk kesirleri bulma ($1/2 = 2/4 = 3/6$).
  3. *Sayı Doğrusu:* Kesrin $[0, 1]$ aralığında gerçek metrik koordinatını konumlandırma.
  4. *Kesir Karşılaştırma:* Ortak payda ve çapraz çarpımla ($3/5 > 1/2$) kesin karşılaştırma.
- **Matematik Motoru:** Tam sayı aritmetiği, Öklid EBOB/EKOK sadeleştirmesi.

### 3. 24 Oyunu (Game of 24)
- **Kural:** Rastgele verilen 4 sayının tamamını tam olarak birer kez kullanarak $+$, $-$, $\times$, $\div$ ve parantezlerle 24 sonucuna ulaşmak.
- **Mekanik:** 3D kartlar doğrudan masada seçilir, işlem operatörleri uygulanır, ara sonuçlar yeni token olarak masaya gelir.
- **Matematik Motoru:** Abstract Syntax Tree (AST) tabanlı rasyonel sayı değerlendiricisi. $8 / (3 - 8/3) = 24$ gibi kesirli ara adımları kayan nokta toleransı olmaksızın tam doğrular.
- **Garanti:** Üretilen her bulmacanın en az bir geçerli çözümü olduğu algoritmik olarak doğrulanır.

### 4. NIM (Combinatorial Game Theory)
- **Kural:** Farklı boyutlardaki yığınlardan sırayla nesne alınır. Her turda tek bir yığından en az 1, en fazla yığındaki tüm nesneler alınabilir. Normal kural gereği son nesneyi alan kazanır.
- **Matematik Motoru:** 
  $$\text{Nim-sum} = H_1 \oplus H_2 \oplus \dots \oplus H_n$$
  - $\text{Nim-sum} \neq 0$: Kazandıran pozisyon (oyuncu sıfırlayabilir).
  - $\text{Nim-sum} = 0$: Kaybettiren pozisyon (rakip doğru oynarsa kaçınılmaz).
- **Yapay Zeka:** Kolay (rastgele), Orta (kısmen optimal), Zor (mükemmel Bouton 1901 stratejisi).
- **Öğretici Mod:** İkili (binary) tablosu ve bit düzeyinde XOR analizi görsel olarak açıklanır.

---

## 🧪 Test Raporu Özeti

Tüm motorlar bağımsız birim testlerle kapsanmıştır:
```
Test Files: 4 passed (4)
Tests:      94 passed (94)
- algebraEngine.test.ts: 24 tests (GCD, fraction simplification, equation solver, balance check)
- fractionEngine.test.ts: 26 tests (Fraction arithmetic, cross-multiply compare, equivalents, LCM)
- game24Engine.test.ts:   14 tests (Solvability DFS, AST validation, division by zero, interactive state)
- nimEngine.test.ts:      30 tests (Nim-sum XOR, optimal moves, Bouton AI, edge cases)
```

Detaylı döküm için `TEST_REPORT.md` dosyasına bakınız.
Lisans bilgileri için `ASSET_CREDITS.md` dosyasına bakınız.
