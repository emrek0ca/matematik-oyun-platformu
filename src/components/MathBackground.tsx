import React from 'react';

/**
 * MathBackground:
 * Sadece kullanıcının yüklediği fotoğraftaki %100 gerçek tebeşir el yazısı
 * işlemlerini A4 kağıt dokusuna doğal kalem çizimi olarak harmanlar.
 * Bilgisayar fontlu yapay metinler tamamen kaldırılmıştır.
 */
export const MathBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* Gerçek El Yazısı Tahta Dokusu (Invert edilerek hafif kurşun kalem eskizine çevrildi) */}
      <div 
        className="absolute inset-0 bg-repeat opacity-20 mix-blend-multiply"
        style={{
          backgroundImage: 'url(/math-board.png)',
          backgroundSize: '800px 533px',
          filter: 'invert(1) contrast(160%) brightness(105%) grayscale(100%)',
        }}
      />
    </div>
  );
};

export default MathBackground;
