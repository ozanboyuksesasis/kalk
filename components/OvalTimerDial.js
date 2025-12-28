import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, PanResponder, Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Path } from 'react-native-svg';

const MAX_MINUTES = 120;
const DEG_PER_MIN = 360 / MAX_MINUTES;
const SNAP_MIN = 5; // 10 dakikadan 5 dakikaya düşürüldü (daha hassas)
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
  const lastVibrationAngleRef = useRef(-1); // Son titreşim verilen açı

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

  /* ---------- TOUCH ---------- */
  const angleFromTouch = (x, y) => {
    const dx = x - center;
    const dy = y - center;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Merkeze çok yakınsa önceki angle'i koru
    const minDistance = PROGRESS_RADIUS * 0.05;
    if (distance < minDistance) {
      return angleRef.current;
    }
    
    // Math.atan2 ile açı hesapla (0° = üstte, saat yönünde artar)
    let deg = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    
    // 0-360 arasına normalize et
    if (deg < 0) deg += 360;
    if (deg >= 360) deg -= 360;
    
    return deg;
  };
  
  // Touch pozisyonunun halka alanında olup olmadığını kontrol et
  const isTouchInDialArea = (x, y) => {
    const dx = x - center;
    const dy = y - center;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const handleRadius = 14;
    const tolerance = 30;
    const minRadius = Math.max(0, PROGRESS_RADIUS - handleRadius - tolerance);
    const maxRadius = PROGRESS_RADIUS + handleRadius + tolerance;
    
    return distance >= minRadius && distance <= maxRadius;
  };

  // Basit delta hesaplama - 360° wrap desteği
  const getAngleDelta = (currentAngle, lastAngle) => {
    let delta = currentAngle - lastAngle;
    
    // 360° geçişlerini düzelt (kısa yolu seç)
    if (delta > 180) {
      delta -= 360;
    } else if (delta < -180) {
      delta += 360;
    }
    
    return delta;
  };

  const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: (evt) => {
          if (isRunning || isAlarm) return false;
          
          const { locationX, locationY } = evt.nativeEvent;
          
          // iOS'ta daha agresif: Touch alanı kontrolü yap ama daha esnek ol
          if (Platform.OS === 'ios') {
            // iOS'ta halka alanı kontrolünü biraz gevşet
            if (isTouchInDialArea(locationX, locationY)) {
              // Scroll'u kapat
              if (scrollViewRef && scrollViewRef.current) {
                try {
                  scrollViewRef.current.setNativeProps({ scrollEnabled: false });
                } catch (e) {
                  // Hata olursa devam et
                }
              }
              return true;
            }
            // iOS'ta: Eğer halka alanına yakınsa da true döndür (daha esnek)
            const dx = locationX - center;
            const dy = locationY - center;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const extendedRadius = PROGRESS_RADIUS + 50; // Daha geniş algılama alanı
            if (distance <= extendedRadius) {
              if (scrollViewRef && scrollViewRef.current) {
                try {
                  scrollViewRef.current.setNativeProps({ scrollEnabled: false });
                } catch (e) {
                  // Hata olursa devam et
                }
              }
              return true;
            }
            return false;
          } else {
            // Android'de normal kontrol
            if (isTouchInDialArea(locationX, locationY)) {
              if (scrollViewRef && scrollViewRef.current) {
                try {
                  scrollViewRef.current.setNativeProps({ scrollEnabled: false });
                } catch (e) {
                  // Hata olursa devam et
                }
              }
              return true;
            }
            return false;
          }
        },
        
        // iOS için: move event'lerini yakalamak için - daha agresif
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          if (isRunning || isAlarm) return false;
          
          if (Platform.OS === 'ios') {
            const { locationX, locationY } = evt.nativeEvent;
            
            // Halka alanı kontrolü
            if (isTouchInDialArea(locationX, locationY)) {
              // Çok küçük hareket eşiği - hemen yakala
              return Math.abs(gestureState.dx) > 0.1 || Math.abs(gestureState.dy) > 0.1;
            }
            
            // Genişletilmiş alan kontrolü
            const dx = locationX - center;
            const dy = locationY - center;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const extendedRadius = PROGRESS_RADIUS + 50;
            if (distance <= extendedRadius) {
              // Küçük hareket eşiği
              return Math.abs(gestureState.dx) > 0.1 || Math.abs(gestureState.dy) > 0.1;
            }
          }
          return false;
        },
        
        // iOS için: PanResponder'ın daha iyi çalışması için
        onPanResponderTerminationRequest: () => false, // iOS'ta scroll ile çakışmayı önle
        onShouldBlockNativeResponder: () => true, // Native gesture'ları engelle

        onPanResponderGrant: (e) => {
          setDragging(true);
          
          // Scroll'u kapat
          if (scrollViewRef && scrollViewRef.current) {
            try {
              scrollViewRef.current.setNativeProps({ scrollEnabled: false });
            } catch (e) {
              // Hata olursa devam et
            }
          }
          
          lastVibrationAngleRef.current = -1; // Yeni dokunma başladığında titreşim flag'ini sıfırla
        },

        onPanResponderMove: e => {
          const { locationX, locationY } = e.nativeEvent;
          
          // iOS'ta daha esnek alan kontrolü
          let shouldProcess = false;
          if (Platform.OS === 'ios') {
            // iOS'ta hem normal hem genişletilmiş alan kontrolü
            if (isTouchInDialArea(locationX, locationY)) {
              shouldProcess = true;
            } else {
              // Genişletilmiş alan kontrolü (daha esnek)
              const dx = locationX - center;
              const dy = locationY - center;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const extendedRadius = PROGRESS_RADIUS + 50;
              if (distance <= extendedRadius) {
                shouldProcess = true;
              }
            }
          } else {
            // Android'de normal kontrol
            shouldProcess = isTouchInDialArea(locationX, locationY);
          }
          
          if (!shouldProcess) {
            return;
          }
          
          const currentAngle = angleFromTouch(locationX, locationY);
          const lastAngle = angleRef.current;
          
          // Delta hesapla
          let delta = getAngleDelta(currentAngle, lastAngle);
          
          // Çok büyük delta'ları filtrele (sıçramaları önle)
          const maxDelta = 90;
          if (Math.abs(delta) > maxDelta) {
            return; // Bu bir sıçrama, görmezden gel
          }
          
          // Delta'yı uygula ve clamp et (0-359.99 arasında kal)
          let newAngle = lastAngle + delta;
          const wasAtMax = lastAngle >= 359.99;
          newAngle = Math.max(0, Math.min(newAngle, 359.99)); // 360°'de dur, 0'a geçme
          
          // 360°'ye ulaştığında ve ileri gitmeye çalıştığında titreşim ver
          if (newAngle >= 359.99 && !wasAtMax && lastVibrationAngleRef.current < 359.99) {
            if (Platform.OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } else {
              Vibration.vibrate(50);
            }
            lastVibrationAngleRef.current = 359.99;
          } else if (newAngle < 359.99) {
            // 360°'den uzaklaştığında titreşim flag'ini sıfırla
            lastVibrationAngleRef.current = -1;
          }
          
          // Her iki platformda da direkt update (basit ve çalışan)
          angleRef.current = newAngle;
          setAngle(newAngle);
          onChange?.(Math.round(newAngle / DEG_PER_MIN));
        },

        onPanResponderRelease: () => {
          setDragging(false);
          
          // Snap yok - hangi açıdaysa o açıda kal (hassas ayar)
          // Sadece clamp et (0-359.99 arasında)
          const finalAngle = Math.max(0, Math.min(angleRef.current, 359.99));
          angleRef.current = finalAngle;
          setAngle(finalAngle);
          onChange?.(Math.round(finalAngle / DEG_PER_MIN));
          
          // Scroll'u tekrar aç
          if (scrollViewRef && scrollViewRef.current) {
            if (Platform.OS === 'ios') {
              // iOS'ta kısa bir delay ile (state reset için)
              setTimeout(() => {
                try {
                  scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
                } catch (e) {
                  // Hata olursa devam et
                }
              }, 50);
            } else {
              try {
                scrollViewRef.current.setNativeProps({ scrollEnabled: true });
              } catch (e) {
                // Hata olursa devam et
              }
            }
          }
        },
        
        onPanResponderTerminate: () => {
          setDragging(false);
          
          // Scroll'u tekrar aç
          if (scrollViewRef && scrollViewRef.current) {
            try {
              scrollViewRef.current.setNativeProps({ scrollEnabled: true });
            } catch (e) {
              // Hata olursa devam et
            }
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
