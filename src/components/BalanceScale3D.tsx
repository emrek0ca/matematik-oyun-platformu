import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';

export interface PanItem {
  id: string;
  type: 'x' | 'constant';
  value: number;
  label: string;
}

export interface BalanceScale3DProps {
  leftItems: PanItem[];
  rightItems: PanItem[];
  leftMass: number;
  rightMass: number;
  onItemClick?: (side: 'left' | 'right', item: PanItem) => void;
  interactive?: boolean;
}

/** Sayı değerini ferah standart pirinç ağırlık parçalarına (10, 5, 2, 1) ayırır */
export function decomposeConstantToWeights(val: number, side: 'left' | 'right'): PanItem[] {
  if (val <= 0) return [];
  const items: PanItem[] = [];
  let rem = val;
  // Küçük sayılarda (<= 6) 2 ve 1'lik ağırlıklar tercih edilir; büyük sayılarda 5 ve 10'luk
  const denoms = val <= 6 ? [2, 1] : [10, 5, 2, 1];
  let idx = 0;
  for (const d of denoms) {
    while (rem >= d) {
      items.push({
        id: `${side}-const-${d}-${idx++}`,
        type: 'constant',
        value: d,
        label: `${d}`,
      });
      rem -= d;
    }
  }
  return items;
}

/** İki 3B nokta arasına gergin pirinç askı teli çizer */
function SuspensionCable({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
  const { mid, length, quaternion } = useMemo(() => {
    const p1 = new THREE.Vector3(...start);
    const p2 = new THREE.Vector3(...end);
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const m = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );
    return { mid: m, length: len, quaternion: q };
  }, [start[0], start[1], start[2], end[0], end[1], end[2]]);

  return (
    <mesh position={mid} quaternion={quaternion}>
      <cylinderGeometry args={[0.018, 0.018, length, 8]} />
      <meshStandardMaterial color="#ca8a04" metalness={0.92} roughness={0.25} />
    </mesh>
  );
}

/** 3B Ferah Bilinmeyen x Sandığı (Geniş Tıklama Alanı ile) */
function CrateXItem({
  item,
  position,
  onClick,
  interactive,
}: {
  item: PanItem;
  position: [number, number, number];
  onClick?: () => void;
  interactive?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={[position[0], position[1] + (hovered ? 0.15 : 0), position[2]]}
      onPointerOver={e => {
        if (!interactive) return;
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={e => {
        if (!interactive) return;
        e.stopPropagation();
        setHovered(false);
      }}
      onClick={e => {
        if (!interactive || !onClick) return;
        e.stopPropagation();
        onClick();
      }}
      scale={hovered ? [1.12, 1.12, 1.12] : [1, 1, 1]}
    >
      {/* Geniş Görünmez Tıklama Alanı (Hitbox) */}
      <mesh position={[0, 0.36, 0]} visible={false}>
        <cylinderGeometry args={[0.6, 0.6, 1.1, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Kutu Gövdesi */}
      <mesh castShadow receiveShadow position={[0, 0.36, 0]}>
        <boxGeometry args={[0.72, 0.72, 0.72]} />
        <meshStandardMaterial
          color={hovered ? '#60a5fa' : '#2563eb'}
          roughness={0.3}
          metalness={0.25}
          emissive={hovered ? '#1d4ed8' : '#000000'}
          emissiveIntensity={hovered ? 0.45 : 0}
        />
      </mesh>

      {/* Metal Köşe Braketleri (4 dikey köşe) */}
      {[
        [-0.36, 0, -0.36],
        [0.36, 0, -0.36],
        [-0.36, 0, 0.36],
        [0.36, 0, 0.36],
      ].map(([bx, by, bz], i) => (
        <mesh key={i} position={[bx, 0.36, bz]}>
          <boxGeometry args={[0.09, 0.73, 0.09]} />
          <meshStandardMaterial color="#71717a" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}

      {/* 3B Çapraz 'x' İşareti - Ön Yüz */}
      <group position={[0, 0.36, 0.365]}>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.55, 0.09, 0.02]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.55, 0.09, 0.02]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
        </mesh>
      </group>

      {/* 3B Çapraz 'x' İşareti - Üst Yüz */}
      <group position={[0, 0.725, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.48, 0.08, 0.02]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.48, 0.08, 0.02]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
        </mesh>
      </group>

      {/* Hover Etiketi */}
      {hovered && (
        <Html position={[0, 1.25, 0]} center distanceFactor={10} pointerEvents="none">
          <div className="bg-zinc-900/95 text-white font-mono text-xs px-2.5 py-1 rounded-lg border-2 border-blue-400 shadow-xl whitespace-nowrap flex items-center gap-1.5 animate-bounce">
            <span className="text-blue-300 font-bold">📦 1x Kaldır</span>
            <span className="text-[10px] text-zinc-300 font-normal">(Tıkla)</span>
          </div>
        </Html>
      )}
    </group>
  );
}

/** 3B Pirinç Hassas Gram Ağırlığı (Geniş Tıklama Alanı ile) */
function BrassWeightItem({
  item,
  position,
  onClick,
  interactive,
}: {
  item: PanItem;
  position: [number, number, number];
  onClick?: () => void;
  interactive?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  // Değere göre belirgin boyut oranları
  const { radius, height } = useMemo(() => {
    switch (item.value) {
      case 1:
        return { radius: 0.25, height: 0.38 };
      case 2:
        return { radius: 0.32, height: 0.50 };
      case 5:
        return { radius: 0.42, height: 0.68 };
      case 10:
        return { radius: 0.52, height: 0.88 };
      default:
        return { radius: 0.32, height: 0.50 };
    }
  }, [item.value]);

  return (
    <group
      position={[position[0], position[1] + (hovered ? 0.15 : 0), position[2]]}
      onPointerOver={e => {
        if (!interactive) return;
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={e => {
        if (!interactive) return;
        e.stopPropagation();
        setHovered(false);
      }}
      onClick={e => {
        if (!interactive || !onClick) return;
        e.stopPropagation();
        onClick();
      }}
      scale={hovered ? [1.14, 1.14, 1.14] : [1, 1, 1]}
    >
      {/* Geniş Görünmez Tıklama Alanı (Hitbox) */}
      <mesh position={[0, height / 2 + 0.1, 0]} visible={false}>
        <cylinderGeometry args={[radius * 1.5, radius * 1.5, height + 0.4, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Silindirik Pirinç Gövde */}
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <cylinderGeometry args={[radius * 0.95, radius, height, 32]} />
        <meshStandardMaterial
          color={hovered ? '#fef08a' : '#eab308'}
          metalness={0.92}
          roughness={0.2}
          emissive={hovered ? '#ca8a04' : '#000000'}
          emissiveIntensity={hovered ? 0.35 : 0}
        />
      </mesh>

      {/* Üst Tutma Sapı / Topuzu */}
      <group position={[0, height + 0.05, 0]}>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[radius * 0.35, radius * 0.45, 0.1, 16]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.92} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <sphereGeometry args={[radius * 0.42, 16, 16]} />
          <meshStandardMaterial
            color={hovered ? '#ffffff' : '#fef08a'}
            metalness={0.95}
            roughness={0.16}
          />
        </mesh>
      </group>

      {/* Sayı Etiketi (HTML Overlay) */}
      <Html position={[0, height / 2, radius + 0.08]} center distanceFactor={9} pointerEvents="none">
        <div className="font-mono font-black text-xs text-amber-950 px-1.5 py-0.5 rounded-md bg-amber-300/90 border border-amber-600 shadow-sm select-none">
          {item.label}
        </div>
      </Html>

      {/* Hover İpucu */}
      {hovered && (
        <Html position={[0, height + 0.7, 0]} center distanceFactor={10} pointerEvents="none">
          <div className="bg-zinc-900/95 text-white font-mono text-xs px-2.5 py-1 rounded-lg border-2 border-amber-400 shadow-xl whitespace-nowrap flex items-center gap-1.5 animate-bounce">
            <span className="text-amber-300 font-bold">⚖️ −{item.value} Kaldır</span>
            <span className="text-[10px] text-zinc-300 font-normal">(Tıkla)</span>
          </div>
        </Html>
      )}
    </group>
  );
}


/** Ferah ve düzenli nesne yerleşimi: x sandıkları solda (-X), pirinç ağırlıklar sağda (+X), geniş pan üzerinde asla çakışmaz */
export function layoutPanItems(items: PanItem[]): { item: PanItem; pos: [number, number, number] }[] {
  const total = items.length;
  if (total === 0) return [];
  if (total === 1) return [{ item: items[0], pos: [0, 0.02, 0] }];

  const xItems = items.filter(it => it.type === 'x');
  const constItems = items.filter(it => it.type === 'constant');

  // Hem x hem sabit sayı varsa: Kefenin solu (-X) ve sağı (+X) olarak ferahça ayır
  if (xItems.length > 0 && constItems.length > 0) {
    const result: { item: PanItem; pos: [number, number, number] }[] = [];

    const placeHalf = (group: PanItem[], isLeft: boolean) => {
      const sign = isLeft ? -1 : 1;
      const count = group.length;
      if (count === 1) {
        result.push({ item: group[0], pos: [sign * 1.05, 0.02, 0] });
      } else if (count === 2) {
        result.push({ item: group[0], pos: [sign * 1.05, 0.02, -0.65] });
        result.push({ item: group[1], pos: [sign * 1.05, 0.02, 0.65] });
      } else if (count === 3) {
        result.push({ item: group[0], pos: [sign * 0.75, 0.02, -0.7] });
        result.push({ item: group[1], pos: [sign * 1.35, 0.02, 0] });
        result.push({ item: group[2], pos: [sign * 0.75, 0.02, 0.7] });
      } else {
        // 4 veya daha fazla nesne: 2 sütunlu düzen
        group.forEach((item, idx) => {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const totalRows = Math.ceil(count / 2);
          const z = (row - (totalRows - 1) / 2) * 0.85;
          const x = sign * (col === 0 ? 0.75 : 1.45);
          result.push({ item, pos: [x, 0.02, Math.max(-1.45, Math.min(1.45, z))] });
        });
      }
    };

    placeHalf(xItems, true);
    placeHalf(constItems, false);
    return result;
  }

  // Sadece tek tip nesne varsa (yalnızca x veya yalnızca sayı): 2.4 yarıçaplı kefe üzerinde geniş dairesel/spiral dağılım
  if (total === 2) {
    return [
      { item: items[0], pos: [-0.95, 0.02, 0] },
      { item: items[1], pos: [0.95, 0.02, 0] },
    ];
  }
  if (total === 3) {
    return [
      { item: items[0], pos: [0, 0.02, -1.05] },
      { item: items[1], pos: [-0.95, 0.02, 0.6] },
      { item: items[2], pos: [0.95, 0.02, 0.6] },
    ];
  }
  if (total <= 6) {
    const radius = 1.25;
    return items.map((item, idx) => {
      const angle = (idx / total) * 2 * Math.PI;
      return {
        item,
        pos: [radius * Math.cos(angle), 0.02, radius * Math.sin(angle)],
      };
    });
  }

  // 7 ve üstü: Merkezde 1 nesne, dış halkada diğerleri
  return items.map((item, idx) => {
    if (idx === 0) return { item, pos: [0, 0.02, 0] };
    const angle = ((idx - 1) / (total - 1)) * 2 * Math.PI;
    return {
      item,
      pos: [1.38 * Math.cos(angle), 0.02, 1.38 * Math.sin(angle)],
    };
  });
}

/** Genişletilmiş Kefe Tabağı ve Düzenli, Ferah Nesne Yerleşimi */
function PanAssembly({
  centerPos,
  hookPos,
  items,
  side,
  onItemClick,
  interactive,
}: {
  centerPos: [number, number, number];
  hookPos: [number, number, number];
  items: PanItem[];
  side: 'left' | 'right';
  onItemClick?: (side: 'left' | 'right', item: PanItem) => void;
  interactive?: boolean;
}) {
  // Geniş kefe yarıçapı: 2.4 birim (3 kat daha geniş alan!)
  const panRadius = 2.4;

  // 3 Askı Zinciri Bağlantı Noktaları (Kefenin en dış kenarında 120 derecelik açılarla)
  const rimPoints: [number, number, number][] = useMemo(() => {
    return [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map(rad => [
      centerPos[0] + panRadius * Math.cos(rad),
      centerPos[1] + 0.16,
      centerPos[2] + panRadius * Math.sin(rad),
    ]);
  }, [centerPos[0], centerPos[1], centerPos[2]]);

  // Ferah ve Düzenli Nesne Yerleşimi
  const positionedItems = useMemo(() => {
    return layoutPanItems(items);
  }, [items]);

  return (
    <group>
      {/* 3 Adet İnce Pirinç Askı Teli */}
      {rimPoints.map((pt, i) => (
        <SuspensionCable key={i} start={hookPos} end={pt} />
      ))}

      {/* Kefe Tabağı Grubu (Yerçekimi yönünde daima yatay kalır) */}
      <group position={centerPos}>
        {/* Çukur Pirinç Tabak Gövdesi */}
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <cylinderGeometry args={[panRadius, panRadius * 0.9, 0.22, 48]} />
          <meshStandardMaterial
            color="#eab308"
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>

        {/* Tabak Kıvrımlı Kenar Halkası */}
        <mesh position={[0, 0.11, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[panRadius, 0.045, 16, 48]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.92} roughness={0.18} />
        </mesh>

        {/* 3 Askı Halka Kancaları */}
        {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((rad, i) => (
          <mesh
            key={i}
            position={[panRadius * Math.cos(rad), 0.16, panRadius * Math.sin(rad)]}
            rotation={[0, rad, 0]}
          >
            <torusGeometry args={[0.08, 0.025, 12, 16]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.92} roughness={0.2} />
          </mesh>
        ))}

        {/* Kefe İçi Ferah Nesneler */}
        {positionedItems.map(({ item, pos }) =>
          item.type === 'x' ? (
            <CrateXItem
              key={item.id}
              item={item}
              position={pos}
              onClick={() => onItemClick?.(side, item)}
              interactive={interactive}
            />
          ) : (
            <BrassWeightItem
              key={item.id}
              item={item}
              position={pos}
              onClick={() => onItemClick?.(side, item)}
              interactive={interactive}
            />
          )
        )}
      </group>
    </group>
  );
}

/** Fiziksel Terazi Sahnesi (Genişletilmiş Kollar ve Hassas Yay Fiziği) */
function ScaleModel({
  leftItems,
  rightItems,
  leftMass,
  rightMass,
  onItemClick,
  interactive,
}: BalanceScale3DProps) {
  const beamRef = useRef<THREE.Group>(null);
  const physicsRef = useRef({
    angle: 0,
    velocity: 0,
  });

  const [currentAngle, setCurrentAngle] = useState(0);

  // Kiriş ve Askı Boyutları (Geniş kefelerin rahat hareket etmesi için)
  const armLength = 5.8; // Merkezden kefe askısına mesafe
  const pivotY = 2.1; // Merkez mafsal yüksekliği
  const chainLength = 3.3; // Askı uzunluğu

  // Fizik motoru: Ağır basan taraf net şekilde aşağı iner, hafif taraf yukarı kalkar!
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    // Kural:
    // leftMass > rightMass (Sol ağır) => targetAngle pozitif (Sol AŞAĞI iner, Sağ YUKARI kalkar).
    // rightMass > leftMass (Sağ ağır) => targetAngle negatif (Sağ AŞAĞI iner, Sol YUKARI kalkar).
    // Eşit olduğunda => targetAngle = 0 (Kefeler tam dengede).
    const massDiff = leftMass - rightMass;
    const totalMass = Math.max(1, (leftMass + rightMass) * 0.35);
    const targetAngle = Math.max(-0.28, Math.min(0.28, (massDiff / totalMass) * 0.28));

    // Doğal yay salınımı ve sönümleme
    const kSpring = 24.0;
    const damping = 4.0;

    const displacement = targetAngle - physicsRef.current.angle;
    const springForce = displacement * kSpring;
    const dampingForce = -physicsRef.current.velocity * damping;
    const accel = springForce + dampingForce;

    physicsRef.current.velocity += accel * dt;
    physicsRef.current.angle += physicsRef.current.velocity * dt;

    // Mekanik durdurucu (maksimum ±16 derece)
    if (physicsRef.current.angle > 0.28) {
      physicsRef.current.angle = 0.28;
      physicsRef.current.velocity = -physicsRef.current.velocity * 0.2;
    } else if (physicsRef.current.angle < -0.28) {
      physicsRef.current.angle = -0.28;
      physicsRef.current.velocity = -physicsRef.current.velocity * 0.2;
    }

    if (beamRef.current) {
      beamRef.current.rotation.z = physicsRef.current.angle;
    }

    setCurrentAngle(physicsRef.current.angle);
  });

  // Kinematik Askı ve Kefe Konumları
  const { leftHook, rightHook, leftPanPos, rightPanPos } = useMemo(() => {
    const sinT = Math.sin(currentAngle);
    const cosT = Math.cos(currentAngle);

    const lHook: [number, number, number] = [-armLength * cosT, pivotY - armLength * sinT, 0];
    const rHook: [number, number, number] = [armLength * cosT, pivotY + armLength * sinT, 0];

    const lPan: [number, number, number] = [lHook[0], lHook[1] - chainLength, 0];
    const rPan: [number, number, number] = [rHook[0], rHook[1] - chainLength, 0];

    return {
      leftHook: lHook,
      rightHook: rHook,
      leftPanPos: lPan,
      rightPanPos: rPan,
    };
  }, [currentAngle]);

  const isBalanced = Math.abs(currentAngle) < 0.02;

  return (
    <group position={[0, -0.1, 0]}>
      {/* ======================= SABİT GÖVDE VE TABAN ======================= */}

      {/* Ahşap Ağır Kaide (Geniş Masif Ceviz Plaka) */}
      <group position={[0, -2.8, 0]}>
        {/* Alt Kademe */}
        <mesh receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[14.8, 0.48, 5.2]} />
          <meshStandardMaterial color="#2d1810" roughness={0.65} metalness={0.06} />
        </mesh>
        {/* Üst Kademe */}
        <mesh receiveShadow position={[0, 0.32, 0]}>
          <boxGeometry args={[13.8, 0.24, 4.4]} />
          <meshStandardMaterial color="#3d2116" roughness={0.6} metalness={0.08} />
        </mesh>

        {/* 4 Köşe Pirinç Seviyeleme Ayakları */}
        {[
          [-6.9, -0.32, -2.2],
          [6.9, -0.32, -2.2],
          [-6.9, -0.32, 2.2],
          [6.9, -0.32, 2.2],
        ].map(([ax, ay, az], i) => (
          <mesh key={i} position={[ax, ay, az]}>
            <cylinderGeometry args={[0.32, 0.44, 0.35, 16]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.92} roughness={0.25} />
          </mesh>
        ))}

        {/* Ön Pirinç İsimlik Plakası */}
        <group position={[0, 0.38, 2.22]}>
          <mesh>
            <boxGeometry args={[4.2, 0.36, 0.04]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.92} roughness={0.2} />
          </mesh>
          <Html position={[0, 0, 0.03]} center distanceFactor={11} pointerEvents="none">
            <div className="font-mono text-xs font-black uppercase tracking-widest text-amber-950 px-2 select-none whitespace-nowrap">
              ⚖️ CEBİR TERAZİSİ ⚖️
            </div>
          </Html>
        </group>
      </group>

      {/* Dikey Pirinç Sütun (Merkez Kolon) */}
      <group position={[0, -0.3, 0]}>
        {/* Sütun Taban Kaidesi */}
        <mesh position={[0, -2.0, 0]}>
          <cylinderGeometry args={[0.85, 1.1, 0.45, 32]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.9} roughness={0.25} />
        </mesh>

        {/* Ana Sütun Gövdesi */}
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.38, 0.52, 4.0, 32]} />
          <meshStandardMaterial color="#eab308" metalness={0.88} roughness={0.22} />
        </mesh>

        {/* Dekoratif Boğum Halkaları */}
        {[-0.9, 1.1, 2.1].map((py, i) => (
          <mesh key={i} position={[0, py, 0]}>
            <torusGeometry args={[0.48, 0.07, 16, 32]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.92} roughness={0.2} />
          </mesh>
        ))}

        {/* Açı Ölçer Skalası (Merkez Gösterge Plakası) */}
        <group position={[0, 1.25, 0.46]}>
          <mesh>
            <boxGeometry args={[2.6, 0.44, 0.06]} />
            <meshStandardMaterial color="#fef08a" metalness={0.85} roughness={0.28} />
          </mesh>
          <Html position={[0, 0, 0.04]} center distanceFactor={10} pointerEvents="none">
            <div className="flex items-center justify-between w-32 text-[10px] font-mono font-bold text-zinc-800 select-none">
              <span>-15°</span>
              <span className={`px-1.5 py-0.5 rounded font-black ${isBalanced ? 'bg-emerald-600 text-white' : 'text-zinc-600'}`}>
                0°
              </span>
              <span>+15°</span>
            </div>
          </Html>
        </group>
      </group>

      {/* ======================= SALINAN KİRİŞ VE İBRE ======================= */}
      <group position={[0, pivotY, 0]}>
        {/* Merkez Rulman Bloğu (Sabit Destek) */}
        <mesh position={[0, 0, -0.12]}>
          <boxGeometry args={[1.0, 0.75, 0.55]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.92} roughness={0.25} />
        </mesh>

        {/* Salınan Grup (Kiriş + İbre) */}
        <group ref={beamRef}>
          {/* Ana Pirinç Kiriş */}
          <mesh castShadow position={[0, 0, 0]}>
            <boxGeometry args={[armLength * 2, 0.26, 0.18]} />
            <meshStandardMaterial color="#eab308" metalness={0.9} roughness={0.2} />
          </mesh>

          {/* Kiriş Üst Güçlendirme Kemeri */}
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[armLength * 1.5, 0.07, 0.14]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.92} roughness={0.25} />
          </mesh>

          {/* Merkez Mafsal Pimi ve Parlak Başlığı */}
          <mesh position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.22, 24]} />
            <meshStandardMaterial color="#ffffff" metalness={0.95} roughness={0.12} />
          </mesh>

          {/* Denge İbresi (Merkezden aşağı açı yayına uzanır) */}
          <group position={[0, 0, 0.48]}>
            {/* İğne Gövdesi */}
            <mesh position={[0, -0.75, 0]}>
              <cylinderGeometry args={[0.025, 0.05, 1.5, 16]} />
              <meshStandardMaterial
                color={isBalanced ? '#059669' : '#dc2626'}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
            {/* İğne Ucu Oku */}
            <mesh position={[0, -1.55, 0]} rotation={[0, 0, Math.PI]}>
              <coneGeometry args={[0.08, 0.2, 16]} />
              <meshStandardMaterial
                color={isBalanced ? '#059669' : '#dc2626'}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          </group>

          {/* Sol Uç Askı Kancası */}
          <mesh position={[-armLength, 0, 0]}>
            <torusGeometry args={[0.18, 0.045, 16, 24]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.92} roughness={0.2} />
          </mesh>

          {/* Sağ Uç Askı Kancası */}
          <mesh position={[armLength, 0, 0]}>
            <torusGeometry args={[0.18, 0.045, 16, 24]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.92} roughness={0.2} />
          </mesh>
        </group>
      </group>

      {/* ======================= FERAH ASKI ZİNCİRLERİ VE KEFELER ======================= */}
      {/* Sol Kefe Montajı */}
      <PanAssembly
        centerPos={leftPanPos}
        hookPos={leftHook}
        items={leftItems}
        side="left"
        onItemClick={onItemClick}
        interactive={interactive}
      />

      {/* Sağ Kefe Montajı */}
      <PanAssembly
        centerPos={rightPanPos}
        hookPos={rightHook}
        items={rightItems}
        side="right"
        onItemClick={onItemClick}
        interactive={interactive}
      />
    </group>
  );
}

/** 3B Cebir Terazisi Ana Bileşeni */
export default function BalanceScale3D({
  leftItems,
  rightItems,
  leftMass,
  rightMass,
  onItemClick,
  interactive = true,
}: BalanceScale3DProps) {
  const controlsRef = useRef<any>(null);

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div className="w-full h-[450px] sm:h-[500px] rounded-2xl overflow-hidden relative border-2 border-zinc-900 bg-gradient-to-b from-stone-100 via-amber-50/50 to-stone-200 select-none shadow-[4px_4px_0px_#18181b]">
      {/* 3B Üst Durum Rozeti */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2 pointer-events-none">
        <div className="px-3 py-1 rounded-xl bg-white/90 backdrop-blur border-2 border-zinc-900 shadow-sm flex items-center gap-2 text-xs font-mono font-bold text-zinc-800">
          <span className="text-base">🧭</span>
          <span>3B Ferah Laboratuvar Terazisi</span>
          <span className="text-[10px] text-zinc-500 font-normal hidden sm:inline">
            (Kefedeki nesnelere tıklayarak alabilir, fareyle döndürebilirsin)
          </span>
        </div>
      </div>

      {/* Kamera Sıfırla Butonu */}
      <div className="absolute top-3 right-4 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={resetCamera}
          className="px-2.5 py-1 rounded-xl bg-white/95 hover:bg-zinc-100 active:scale-95 border-2 border-zinc-900 text-xs font-mono font-bold text-zinc-800 shadow-[2px_2px_0px_#18181b] transition-all flex items-center gap-1.5"
          title="Kamera Bakış Açısını Sıfırla"
        >
          <span>🔄</span> Açıyı Sıfırla
        </button>
      </div>

      {/* R3F Canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 2.5, 12.5], fov: 46 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Işıklandırma */}
        <ambientLight intensity={0.95} />
        <directionalLight
          position={[8, 14, 8]}
          intensity={2.0}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0001}
        />
        <pointLight position={[-8, 6, -3]} intensity={0.7} color="#dbeafe" />
        <pointLight position={[0, 4, 6]} intensity={0.65} color="#fef08a" />

        {/* Yumuşak Zemin Temas Gölgesi */}
        <ContactShadows
          position={[0, -3.2, 0]}
          opacity={0.65}
          scale={18}
          blur={1.8}
          far={5}
        />

        {/* Terazi Modeli */}
        <ScaleModel
          leftItems={leftItems}
          rightItems={rightItems}
          leftMass={leftMass}
          rightMass={rightMass}
          onItemClick={onItemClick}
          interactive={interactive}
        />

        {/* Orbit Kontrolleri */}
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2 - 0.04}
          minDistance={7.0}
          maxDistance={16.0}
          dampingFactor={0.06}
        />
      </Canvas>
    </div>
  );
}
