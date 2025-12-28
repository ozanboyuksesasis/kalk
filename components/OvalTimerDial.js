import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, PanResponder, Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Path } from 'react-native-svg';

const MAX_MINUTES = 120;
const DEG_PER_MIN = 360 / MAX_MINUTES;
const SNAP_MIN = 10;
const SNAP_DEG = SNAP_MIN * DEG_PER_MIN;

export default function OvalTimerDial({
                                        size = 220,
                                        strokeWidth = 12,
                                        onChange,
                                        isRunning = false,
                                        isAlarm = false,
                                        duration = null,
                                        scrollViewRef = null,
                                      }) {
  const center = size / 2;

  /* ---------- STROKES ---------- */
  const BASE_STROKE = strokeWidth;
  const BASE_OUTER = 3;
  const PROGRESS_STROKE = BASE_STROKE + 2;

  /* ---------- RADII ---------- */
  const BASE_RADIUS = center - BASE_STROKE / 2 - 2;
  const PROGRESS_RADIUS = BASE_RADIUS + (PROGRESS_STROKE - BASE_STROKE) / 2;

  /* ---------- STATE ---------- */
  const [angle, setAngle] = useState(0);
  const angleRef = useRef(0);
  const [dragging, setDragging] = useState(false);
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const lastVibrationAngleRef = useRef(-1); // Son titreşim verilen açı (tekrar titreşim vermemek için)

  /* ---------- POLAR HELPERS ---------- */
  const polar = (cx, cy, r, a) => {
    const rad = (a - 90) * Math.PI / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const arc = (cx, cy, r, start, end) => {
    const e = polar(cx, cy, r, end);
    const large = end - start > 180 ? 1 : 0;
    return `A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  /* ---------- SINGLE SAFE PATH ---------- */
  const progressPath = (cx, cy, r, a) => {
    if (a <= 0) return '';

    const start = polar(cx, cy, r, 0);
    let d = `M ${start.x} ${start.y}`;

    if (a <= 180) {
      d += ' ' + arc(cx, cy, r, 0, a);
    } else {
      d += ' ' + arc(cx, cy, r, 0, 179.99);
      d += ' ' + arc(cx, cy, r, 180, a);
    }

    return d;
  };

  /* ---------- EFFECT ---------- */
  useEffect(() => {
    if (!dragging && duration > 0) {
      const a = Math.min((duration / MAX_MINUTES) * 360, 359.99);
      angleRef.current = a;
      setAngle(a);
    }
  }, [duration, dragging]);
  
  // Cleanup: Component unmount olduğunda animation frame'i iptal et
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  /* ---------- TOUCH ---------- */
  const angleFromTouch = (x, y) => {
    const dx = x - center;
    const dy = y - center;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Merkeze çok yakınsa önceki angle'i koru (hassasiyet için)
    if (distance < PROGRESS_RADIUS * 0.3) {
      return angleRef.current;
    }
    
    let deg = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    return deg < 0 ? deg + 360 : deg;
  };

  // Angle delta hesapla (önceki touch'tan değişim) - 360° wrap desteği
  const getAngleDelta = (currentAngle, lastAngle) => {
    let delta = currentAngle - lastAngle;
    
    // 360° geçişlerini düzelt (kısa yolu seç)
    // Örn: 350° -> 10° = +20° (360° üzerinden değil, direkt +20°)
    // Örn: 10° -> 350° = -20° (360° üzerinden değil, direkt -20°)
    if (delta > 180) {
      delta -= 360;
    } else if (delta < -180) {
      delta += 360;
    }
    
    return delta;
  };
  
  // Angle'ı 0-360 arasında wrap et (360°'den sonra 0'a devam, 0'dan önce 360°'ye)
  const wrapAngle = (a) => {
    a = a % 360;
    if (a < 0) a += 360;
    return a;
  };

  // iOS için smooth update mekanizması - daha agresif optimizasyon
  const animationFrameRef = useRef(null);
  const pendingAngleRef = useRef(null);
  
  // iOS'ta sürekli update için recursive fonksiyon
  const scheduleUpdate = () => {
    if (pendingAngleRef.current !== null) {
      const angle = pendingAngleRef.current;
      angleRef.current = angle;
      setAngle(angle);
      onChange?.(Math.round(angle / DEG_PER_MIN));
      pendingAngleRef.current = null;
    }
    animationFrameRef.current = null;
    
    // Eğer hala pending angle varsa tekrar schedule et
    if (pendingAngleRef.current !== null) {
      animationFrameRef.current = requestAnimationFrame(scheduleUpdate);
    }
  };
  
  // iOS'ta smooth update fonksiyonu (requestAnimationFrame ile)
  const updateAngleSmooth = (newAngle) => {
    if (Platform.OS === 'ios') {
      // En son angle'i kaydet (her touch event'inde güncellenir)
      pendingAngleRef.current = newAngle;
      
      // requestAnimationFrame ile smooth update (sadece bir kez schedule et)
      if (animationFrameRef.current === null) {
        animationFrameRef.current = requestAnimationFrame(scheduleUpdate);
      }
    } else {
      // Android'de direkt update (mevcut davranış - değişmedi)
      angleRef.current = newAngle;
      setAngle(newAngle);
      onChange?.(Math.round(newAngle / DEG_PER_MIN));
    }
  };

  const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: (evt) => {
          if (isRunning || isAlarm) return false;
          // Halka alanına dokunulduğunda scroll'u hemen kapat
          scrollViewRef?.setNativeProps({ scrollEnabled: false });
          return true;
        },
        
        // iOS için kritik: move event'lerini daha iyi yakalamak için
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          if (isRunning || isAlarm) return false;
          // iOS'ta daha hassas başlangıç için küçük hareket eşiği
          if (Platform.OS === 'ios') {
            return Math.abs(gestureState.dx) > 1 || Math.abs(gestureState.dy) > 1;
          }
          return false; // Android'de sadece onStartShouldSetPanResponder yeterli
        },
        
        // iOS için: PanResponder'ın daha iyi çalışması için
        onPanResponderTerminationRequest: () => false, // iOS'ta scroll ile çakışmayı önle
        onShouldBlockNativeResponder: () => true, // Native gesture'ları engelle

        onPanResponderGrant: (e) => {
          setDragging(true);
          scrollViewRef?.setNativeProps({ scrollEnabled: false });
          const { locationX, locationY } = e.nativeEvent;
          lastTouchRef.current = { x: locationX, y: locationY };
          pendingAngleRef.current = null;
          lastVibrationAngleRef.current = -1; // Yeni dokunma başladığında titreşim flag'ini sıfırla
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
        },

        onPanResponderMove: e => {
          const { locationX, locationY } = e.nativeEvent;
          const currentAngle = angleFromTouch(locationX, locationY);
          const lastAngle = angleRef.current;
          
          // Delta hesapla (büyük sıçramaları önle)
          const delta = getAngleDelta(currentAngle, lastAngle);
          
          // Çok büyük delta'ları filtrele (hassasiyet için)
          const maxDelta = Platform.OS === 'ios' ? 45 : 90;
          if (Math.abs(delta) > maxDelta) {
            return; // Bu bir sıçrama, görmezden gel
          }
          
          // Delta'yı uygula ve clamp et (0-359.99 arasında kal, wrap yok)
          let newAngle = lastAngle + delta;
          const wasAtMax = lastAngle >= 359.99;
          newAngle = Math.max(0, Math.min(newAngle, 359.99)); // 360°'de dur, 0'a geçme
          
          // 360°'ye ulaştığında ve ileri gitmeye çalıştığında titreşim ver
          // (Sadece 360°'ye ulaştığında bir kez, tekrar tekrar değil)
          if (newAngle >= 359.99 && !wasAtMax && lastVibrationAngleRef.current < 359.99) {
            // 360°'ye ulaştı, titreşim ver
            if (Platform.OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } else {
              Vibration.vibrate(50);
            }
            lastVibrationAngleRef.current = 359.99;
          }
          
          // iOS'ta smooth update, Android'de direkt update
          if (Platform.OS === 'ios') {
            updateAngleSmooth(newAngle);
          } else {
            angleRef.current = newAngle;
            setAngle(newAngle);
            onChange?.(Math.round(newAngle / DEG_PER_MIN));
          }
          
          lastTouchRef.current = { x: locationX, y: locationY };
        },

        onPanResponderRelease: () => {
          setDragging(false);
          scrollViewRef?.setNativeProps({ scrollEnabled: true });
          
          // iOS'ta pending update'i tamamla
          if (Platform.OS === 'ios' && pendingAngleRef.current !== null) {
            const angle = pendingAngleRef.current;
            angleRef.current = angle;
            setAngle(angle);
            pendingAngleRef.current = null;
          }
          
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }

          const snap = Math.round(angleRef.current / SNAP_DEG) * SNAP_DEG;
          const clampedSnap = Math.max(0, Math.min(snap, 359.99)); // 360°'de dur, 0'a geçme
          angleRef.current = clampedSnap;
          setAngle(clampedSnap);
          onChange?.(Math.round(clampedSnap / DEG_PER_MIN));
        },
        
        onPanResponderTerminate: () => {
          // iOS'ta gesture iptal edildiğinde (örn: scroll başladığında)
          setDragging(false);
          scrollViewRef?.setNativeProps({ scrollEnabled: true });
          pendingAngleRef.current = null;
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
        },
      })
  ).current;

  /* ---------- HANDLE ---------- */
  const hAngle = angle - 90;
  const hx = center + PROGRESS_RADIUS * Math.cos(hAngle * Math.PI / 180);
  const hy = center + PROGRESS_RADIUS * Math.sin(hAngle * Math.PI / 180);

  const isDisabled = isRunning || isAlarm;
  
  return (
    <View 
      style={[
        { width: size, height: size },
        isDisabled && { opacity: 0.5 }
      ]} 
      {...(!isDisabled ? panResponder.panHandlers : {})}
      pointerEvents={isDisabled ? 'none' : 'auto'}
    >
        <Svg width={size} height={size}>
          {/* Base ring */}
          <Circle
              cx={center}
              cy={center}
              r={BASE_RADIUS}
              stroke="#E0E0E0"
              strokeWidth={BASE_OUTER}
              fill="none"
          />

          {/* Progress ring (Forest style – single path) */}
          {angle > 0 && (
              <Path
                  d={progressPath(center, center, PROGRESS_RADIUS, angle)}
                  stroke="#2196F3"
                  strokeWidth={PROGRESS_STROKE}
                  fill="none"
                  strokeLinecap="butt"
              />
          )}
        </Svg>

        {/* Handle */}
        <View
            style={[
              styles.handle,
              { left: hx - 14, top: hy - 14 },
            ]}
        />
      </View>
  );
}

const styles = StyleSheet.create({
  handle: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2196F3',
    borderWidth: 4,
    borderColor: '#fff',
    elevation: 6,
  },
});
