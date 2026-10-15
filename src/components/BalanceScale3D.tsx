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

/** Sayı değerini standart pirinç ağırlık parçalarına (10, 5, 2, 1) ayırır */
export function decomposeConstantToWeights(val: number, side: 'left' | 'right'): PanItem[] {
  if (val <= 0) return [];
  const items: PanItem[] = [];
  let rem = val;
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

/** İki 3B nokta arasına ince pirinç askı teli/çubuğu çizer */
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
      <cylinderGeometry args={[0.016, 0.016, length, 8]} />
      <meshStandardMaterial color="#ca8a04" metalness={0.9} roughness={0.25} />
    </mesh>
  );
}

/** 3B Bilinmeyen x Sandığı */
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
      position={position}
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
      {/* Kutu Gövdesi */}
      <mesh castShadow receiveShadow position={[0, 0.32, 0]}>
        <boxGeometry args={[0.64, 0.64, 0.64]} />
        <meshStandardMaterial
          color={hovered ? '#3b82f6' : '#2563eb'}
          roughness={0.35}
          metalness={0.25}
          emissive={hovered ? '#1d4ed8' : '#000000'}
          emissiveIntensity={hovered ? 0.4 : 0}
        />
      </mesh>

      {/* Metal Köşe Braketleri (4 dikey köşe) */}
      {[
        [-0.32, 0, -0.32],
        [0.32, 0, -0.32],
        [-0.32, 0, 0.32],
        [0.32, 0, 0.32],
      ].map(([bx, by, bz], i) => (
        <mesh key={i} position={[bx, 0.32, bz]}>
          <boxGeometry args={[0.08, 0.65, 0.08]} />
          <meshStandardMaterial color="#71717a" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}

      {/* 3B Çapraz 'x' İşareti - Ön Yüz */}
      <group position={[0, 0.32, 0.325]}>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.48, 0.08, 0.02]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.48, 0.08, 0.02]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
        </mesh>
      </group>

      {/* 3B Çapraz 'x' İşareti - Üst Yüz */}
      <group position={[0, 0.645, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.42, 0.07, 0.02]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.42, 0.07, 0.02]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
        </mesh>
      </group>

      {/* Hover Etiketi */}
      {hovered && (
        <Html position={[0, 1.1, 0]} center distanceFactor={10} pointerEvents="none">
          <div className="bg-zinc-900/95 text-white font-mono text-xs px-2.5 py-1 rounded-lg border border-blue-400 shadow-xl whitespace-nowrap flex items-center gap-1.5 animate-bounce">
            <span className="text-blue-300 font-bold">📦 1x Eksilt</span>
            <span className="text-[10px] text-zinc-400">(Tıkla)</span>
          </div>
        </Html>
      )}
    </group>
  );
}

/** 3B Pirinç Hassas Gram Ağırlığı */
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

  // Değere göre boyut oranları
  const { radius, height } = useMemo(() => {
    switch (item.value) {
      case 1:
        return { radius: 0.22, height: 0.32 };
      case 2:
        return { radius: 0.27, height: 0.42 };
      case 5:
        return { radius: 0.34, height: 0.54 };
      case 10:
        return { radius: 0.42, height: 0.68 };
      default:
        return { radius: 0.28, height: 0.44 };
    }
  }, [item.value]);

  return (
    <group
      position={position}
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
      {/* Silindirik Pirinç Gövde */}
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <cylinderGeometry args={[radius * 0.95, radius, height, 32]} />
        <meshStandardMaterial
          color={hovered ? '#fde047' : '#eab308'}
          metalness={0.9}
          roughness={0.2}
          emissive={hovered ? '#ca8a04' : '#000000'}
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </mesh>

      {/* Üst Tutma Topuzu (Cımbız/Parmak Halkası) */}
      <group position={[0, height + 0.05, 0]}>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[radius * 0.35, radius * 0.45, 0.1, 16]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.92} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.14, 0]}>
          <sphereGeometry args={[radius * 0.42, 16, 16]} />
          <meshStandardMaterial
            color={hovered ? '#fef08a' : '#eab308'}
            metalness={0.95}
            roughness={0.18}
          />
        </mesh>
      </group>

      {/* Sayı Etiketi (HTML Overlay) */}
      <Html position={[0, height / 2, radius + 0.05]} center distanceFactor={9} pointerEvents="none">
        <div className="font-mono font-black text-xs text-amber-950 px-1 py-0.5 rounded bg-amber-300/80 border border-amber-600/50 select-none shadow-sm">
          {item.label}
        </div>
      </Html>

      {/* Hover İpucu */}
      {hovered && (
        <Html position={[0, height + 0.6, 0]} center distanceFactor={10} pointerEvents="none">
          <div className="bg-zinc-900/95 text-white font-mono text-xs px-2.5 py-1 rounded-lg border border-amber-400 shadow-xl whitespace-nowrap flex items-center gap-1.5 animate-bounce">
            <span className="text-amber-300 font-bold">⚖️ −{item.value} Eksilt</span>
            <span className="text-[10px] text-zinc-400">(Tıkla)</span>
          </div>
        </Html>
      )}
    </group>
  );
}

/** Kefe Tabağı ve İçindeki Nesnelerin Dizilimi */
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
  const panRadius = 1.35;

  // 3 Askı Zinciri Bağlantı Noktaları (120 derecelik açılar)
  const rimPoints: [number, number, number][] = useMemo(() => {
    return [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map(rad => [
      centerPos[0] + panRadius * Math.cos(rad),
      centerPos[1] + 0.12,
      centerPos[2] + panRadius * Math.sin(rad),
    ]);
  }, [centerPos[0], centerPos[1], centerPos[2]]);

  // Kefe üzerindeki nesnelerin dairesel yerleşimi
  const positionedItems = useMemo(() => {
    const total = items.length;
    if (total === 0) return [];
    if (total === 1) return [{ item: items[0], pos: [0, 0.02, 0] as [number, number, number] }];

    return items.map((item, idx) => {
      // Çift halkalı spiral veya dairesel dağılım
      const angle = (idx / total) * 2 * Math.PI;
      const r = total > 4 ? (idx % 2 === 0 ? 0.45 : 0.8) : 0.62;
      return {
        item,
        pos: [r * Math.cos(angle), 0.02, r * Math.sin(angle)] as [number, number, number],
      };
    });
  }, [items]);

  return (
    <group>
      {/* 3 Adet Askı Teli */}
      {rimPoints.map((pt, i) => (
        <SuspensionCable key={i} start={hookPos} end={pt} />
      ))}

      {/* Kefe Tabağı Grubu (Yerçekimi ile daima yatay kalır) */}
      <group position={centerPos}>
        {/* Tabak Tabanı ve Çukuru */}
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <cylinderGeometry args={[panRadius, panRadius * 0.88, 0.16, 48]} />
          <meshStandardMaterial
            color="#eab308"
            metalness={0.88}
            roughness={0.22}
          />
        </mesh>

        {/* Tabak Kıvrımlı Kenar Halkası */}
        <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[panRadius, 0.035, 16, 48]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.92} roughness={0.2} />
        </mesh>

        {/* 3 Askı Halka Kancaları */}
        {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((rad, i) => (
          <mesh
            key={i}
            position={[panRadius * Math.cos(rad), 0.12, panRadius * Math.sin(rad)]}
            rotation={[0, rad, 0]}
          >
            <torusGeometry args={[0.06, 0.02, 12, 16]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.92} roughness={0.2} />
          </mesh>
        ))}

        {/* Kefe İçi Nesneler */}
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

/** Fiziksel Terazi Sahnesi */
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

  // Kiriş parametreleri
  const armLength = 4.3; // Merkezden kefe askısına mesafe
  const pivotY = 1.7; // Merkez mafsal yüksekliği
  const chainLength = 2.6; // Askı uzunluğu

  // Fizik motoru: useFrame içerisinde kütle farkı torku & yay-sönümleyici salınımı
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    // Kural: Ağır basan taraf aşağı iner!
    // Three.js koordinat sisteminde Z ekseni etrafında pozitif rotasyon (saat yönü tersi):
    // Sol uç aşağı iner, Sağ uç yukarı kalkar!
    // Dolayısıyla:
    // leftMass > rightMass (Sol ağır) => targetAngle pozitif olmalı (Sol AŞAĞI iner).
    // rightMass > leftMass (Sağ ağır) => targetAngle negatif olmalı (Sağ AŞAĞI iner).
    // Eşit olduğunda => targetAngle = 0 (Kefeler tam dengede).
    const massDiff = leftMass - rightMass;
    const totalMass = Math.max(1, (leftMass + rightMass) * 0.4);
    const targetAngle = Math.max(-0.31, Math.min(0.31, (massDiff / totalMass) * 0.3));

    // Yay sabiti ve sönümleme
    const kSpring = 22.0;
    const damping = 3.8;

    const displacement = targetAngle - physicsRef.current.angle;
    const springForce = displacement * kSpring;
    const dampingForce = -physicsRef.current.velocity * damping;
    const accel = springForce + dampingForce;

    physicsRef.current.velocity += accel * dt;
    physicsRef.current.angle += physicsRef.current.velocity * dt;

    // Mekanik durdurucu (maksimum ±18 derece)
    if (physicsRef.current.angle > 0.31) {
      physicsRef.current.angle = 0.31;
      physicsRef.current.velocity = -physicsRef.current.velocity * 0.2;
    } else if (physicsRef.current.angle < -0.31) {
      physicsRef.current.angle = -0.31;
      physicsRef.current.velocity = -physicsRef.current.velocity * 0.2;
    }

    if (beamRef.current) {
      beamRef.current.rotation.z = physicsRef.current.angle;
    }

    // React durumunu yumuşak güncelle
    setCurrentAngle(physicsRef.current.angle);
  });

  // Kinematik Askı ve Kefe Konumları
  const { leftHook, rightHook, leftPanPos, rightPanPos } = useMemo(() => {
    // Sol uç: x = -armLength * cos(theta), y = pivotY - armLength * sin(theta)
    // Sağ uç: x = +armLength * cos(theta), y = pivotY + armLength * sin(theta)
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
    <group position={[0, -0.2, 0]}>
      {/* ======================= SABİT GÖVDE VE TABAN ======================= */}

      {/* Ahşap Ağır Kaide (İki Kademeli Ceviz Ağacı) */}
      <group position={[0, -2.8, 0]}>
        {/* Alt Kademe */}
        <mesh receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[11.5, 0.45, 4.2]} />
          <meshStandardMaterial color="#2d1810" roughness={0.65} metalness={0.06} />
        </mesh>
        {/* Üst Kademe */}
        <mesh receiveShadow position={[0, 0.3, 0]}>
          <boxGeometry args={[10.6, 0.22, 3.6]} />
          <meshStandardMaterial color="#3d2116" roughness={0.6} metalness={0.08} />
        </mesh>

        {/* 4 Köşe Pirinç Ayak */}
        {[
          [-5.3, -0.3, -1.8],
          [5.3, -0.3, -1.8],
          [-5.3, -0.3, 1.8],
          [5.3, -0.3, 1.8],
        ].map(([ax, ay, az], i) => (
          <mesh key={i} position={[ax, ay, az]}>
            <cylinderGeometry args={[0.26, 0.36, 0.3, 16]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.92} roughness={0.25} />
          </mesh>
        ))}

        {/* Ön Pirinç İsimlik Plakası */}
        <group position={[0, 0.35, 1.82]}>
          <mesh>
            <boxGeometry args={[3.6, 0.32, 0.04]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.92} roughness={0.2} />
          </mesh>
          <Html position={[0, 0, 0.03]} center distanceFactor={11} pointerEvents="none">
            <div className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-amber-950 px-2 select-none whitespace-nowrap">
              ⚖️ CEBİR TERAZİSİ ⚖️
            </div>
          </Html>
        </group>
      </group>

      {/* Dikey Pirinç Sütun (Merkez Kolon) */}
      <group position={[0, -0.5, 0]}>
        {/* Sütun Taban Kaidesi */}
        <mesh position={[0, -1.85, 0]}>
          <cylinderGeometry args={[0.75, 0.95, 0.4, 32]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.9} roughness={0.25} />
        </mesh>

        {/* Ana Sütun Gövdesi */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.34, 0.46, 3.6, 32]} />
          <meshStandardMaterial color="#eab308" metalness={0.88} roughness={0.22} />
        </mesh>

        {/* Dekoratif Bilezikler */}
        {[-0.9, 0.9, 1.8].map((py, i) => (
          <mesh key={i} position={[0, py, 0]}>
            <torusGeometry args={[0.42, 0.06, 16, 32]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.92} roughness={0.2} />
          </mesh>
        ))}

        {/* Açı Ölçer Skalası (Merkez Gösterge Plakası) */}
        <group position={[0, 1.0, 0.42]}>
          {/* Pirinç Açı Yayı */}
          <mesh rotation={[0, 0, 0]}>
            <boxGeometry args={[2.2, 0.38, 0.06]} />
            <meshStandardMaterial color="#fef08a" metalness={0.85} roughness={0.3} />
          </mesh>
          {/* Açı Çentikleri ve Sıfır Noktası */}
          <Html position={[0, 0, 0.04]} center distanceFactor={10} pointerEvents="none">
            <div className="flex items-center justify-between w-28 text-[9px] font-mono font-bold text-zinc-800 select-none">
              <span>-15°</span>
              <span className={`px-1 rounded font-black ${isBalanced ? 'bg-emerald-600 text-white' : 'text-zinc-600'}`}>
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
        <mesh position={[0, 0, -0.1]}>
          <boxGeometry args={[0.9, 0.65, 0.5]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.92} roughness={0.25} />
        </mesh>

        {/* Salınan Grup (Kiriş + İbre) */}
        <group ref={beamRef}>
          {/* Ana Pirinç Kiriş */}
          <mesh castShadow position={[0, 0, 0]}>
            <boxGeometry args={[armLength * 2, 0.22, 0.16]} />
            <meshStandardMaterial color="#eab308" metalness={0.9} roughness={0.2} />
          </mesh>

          {/* Kiriş Üst/Alt Güçlendirme Kafesi */}
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[armLength * 1.5, 0.06, 0.12]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.92} roughness={0.25} />
          </mesh>

          {/* Merkez Mafsal Pimi ve Başlığı */}
          <mesh position={[0, 0, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.2, 24]} />
            <meshStandardMaterial color="#ffffff" metalness={0.95} roughness={0.15} />
          </mesh>

          {/* Denge İbresi (Merkezden aşağı derece yayına uzanır) */}
          <group position={[0, 0, 0.44]}>
            {/* İğne Gövdesi */}
            <mesh position={[0, -0.65, 0]}>
              <cylinderGeometry args={[0.02, 0.045, 1.3, 16]} />
              <meshStandardMaterial
                color={isBalanced ? '#059669' : '#dc2626'}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
            {/* İğne Ucu Oku */}
            <mesh position={[0, -1.35, 0]} rotation={[0, 0, Math.PI]}>
              <coneGeometry args={[0.07, 0.18, 16]} />
              <meshStandardMaterial
                color={isBalanced ? '#059669' : '#dc2626'}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          </group>

          {/* Sol Uç Askı Kancası */}
          <mesh position={[-armLength, 0, 0]}>
            <torusGeometry args={[0.16, 0.04, 16, 24]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.92} roughness={0.2} />
          </mesh>

          {/* Sağ Uç Askı Kancası */}
          <mesh position={[armLength, 0, 0]}>
            <torusGeometry args={[0.16, 0.04, 16, 24]} />
            <meshStandardMaterial color="#ca8a04" metalness={0.92} roughness={0.2} />
          </mesh>
        </group>
      </group>

      {/* ======================= ASKI ZİNCİRLERİ VE KEFELER ======================= */}
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
    <div className="w-full h-[430px] sm:h-[480px] rounded-2xl overflow-hidden relative border-2 border-zinc-900 bg-gradient-to-b from-stone-100 via-amber-50/40 to-stone-200 select-none shadow-[4px_4px_0px_#18181b]">
      {/* 3B Üst Durum Rozeti */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2 pointer-events-none">
        <div className="px-3 py-1 rounded-xl bg-white/90 backdrop-blur border-2 border-zinc-900 shadow-sm flex items-center gap-2 text-xs font-mono font-bold text-zinc-800">
          <span className="text-base">🧭</span>
          <span>3B Etkileşimli Terazi</span>
          <span className="text-[10px] text-zinc-500 font-normal hidden sm:inline">
            (Döndürmek için sürükle, yakınlaştırmak için tekerleği kullan)
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
        camera={{ position: [0, 2.2, 9.8], fov: 46 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Işıklandırma */}
        <ambientLight intensity={0.9} />
        <directionalLight
          position={[7, 13, 7]}
          intensity={1.9}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0001}
        />
        <pointLight position={[-7, 5, -3]} intensity={0.7} color="#dbeafe" />
        <pointLight position={[0, 4, 5]} intensity={0.6} color="#fef08a" />

        {/* Yumuşak Zemin Temas Gölgesi */}
        <ContactShadows
          position={[0, -3.2, 0]}
          opacity={0.65}
          scale={15}
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
          minDistance={6.0}
          maxDistance={14.0}
          dampingFactor={0.06}
        />
      </Canvas>
    </div>
  );
}
