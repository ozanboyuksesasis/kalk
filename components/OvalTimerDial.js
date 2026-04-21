import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Modal,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import Svg, { Circle, Path, Line } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MAX_MINUTES = 120;
const DEG_PER_MIN = 360 / MAX_MINUTES; // 3°
const MAX_ANGLE = 359.99;
const WEDGE_HALF = 2;

const PRESETS = [15, 30, 45, 60, 90, 120];

/* ---------- SHARED HELPERS ---------- */
const polar = (cx, cy, r, a) => {
  const rad = (a - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const arc = (cx, cy, r, start, end) => {
  const e = polar(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
};

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

/* ---------- DIAL VIEW (pure render) ---------- */
function DialView({ size, strokeWidth, angle, panHandlers, showTicks = false }) {
  const center = size / 2;
  const BASE_STROKE = strokeWidth;
  const BASE_OUTER = 3;
  const PROGRESS_STROKE = BASE_STROKE + 2;
  const BASE_RADIUS = center - BASE_STROKE / 2 - 2;
  const PROGRESS_RADIUS = BASE_RADIUS + (PROGRESS_STROKE - BASE_STROKE) / 2;

  const hAngle = angle - 90;
  const hx = center + PROGRESS_RADIUS * Math.cos(hAngle * Math.PI / 180);
  const hy = center + PROGRESS_RADIUS * Math.sin(hAngle * Math.PI / 180);

  const ticks = [];
  if (showTicks) {
    const tickOuterR = BASE_RADIUS - BASE_STROKE / 2 - 6;
    for (let m = 0; m < MAX_MINUTES; m += 5) {
      const isMajor = m % 15 === 0;
      const deg = (m * DEG_PER_MIN) - 90;
      const rad = deg * Math.PI / 180;
      const rInner = tickOuterR - (isMajor ? 10 : 5);
      const x1 = center + tickOuterR * Math.cos(rad);
      const y1 = center + tickOuterR * Math.sin(rad);
      const x2 = center + rInner * Math.cos(rad);
      const y2 = center + rInner * Math.sin(rad);
      ticks.push(
        <Line
          key={m}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={isMajor ? '#90A4AE' : '#CFD8DC'}
          strokeWidth={isMajor ? 2 : 1}
          strokeLinecap="round"
        />
      );
    }
  }

  return (
    <View style={{ width: size, height: size }} {...(panHandlers || {})}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={BASE_RADIUS}
          stroke="#E0E0E0"
          strokeWidth={BASE_OUTER}
          fill="none"
        />
        {ticks}
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
      <View style={[styles.handle, { left: hx - 14, top: hy - 14 }]} />
    </View>
  );
}

/* ---------- EDITABLE DIAL (inside modal) ---------- */
function EditableDial({ size, strokeWidth, initialMinutes, onMinutesChange }) {
  const center = size / 2;
  const BASE_STROKE = strokeWidth;
  const PROGRESS_STROKE = BASE_STROKE + 2;
  const BASE_RADIUS = center - BASE_STROKE / 2 - 2;
  const PROGRESS_RADIUS = BASE_RADIUS + (PROGRESS_STROKE - BASE_STROKE) / 2;

  const initialAngle = Math.min(((initialMinutes || 0) / MAX_MINUTES) * 360, MAX_ANGLE);

  const [angle, setAngle] = useState(initialAngle);
  const angleRef = useRef(initialAngle);
  const lastTouchAngleRef = useRef(0);
  const wedgeLockRef = useRef(false);
  const lastReportedMinRef = useRef(initialMinutes || 0);

  const angleFromTouch = (x, y) => {
    const dx = x - center;
    const dy = y - center;
    let deg = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    if (deg < 0) deg += 360;
    if (deg >= 360) deg -= 360;
    return deg;
  };

  const isTouchInDialArea = (x, y) => {
    const dx = x - center;
    const dy = y - center;
    return Math.sqrt(dx * dx + dy * dy) <= PROGRESS_RADIUS + 30;
  };

  const wrapDelta = (d) => {
    if (d > 180)  return d - 360;
    if (d < -180) return d + 360;
    return d;
  };

  const isInTopWedge = (a) => a <= WEDGE_HALF || a >= (360 - WEDGE_HALF);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        return isTouchInDialArea(locationX, locationY);
      },
      onMoveShouldSetPanResponder: (evt, gs) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (!isTouchInDialArea(locationX, locationY)) return false;
        return Math.abs(gs.dx) > 0.5 || Math.abs(gs.dy) > 0.5;
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,

      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        lastTouchAngleRef.current = angleFromTouch(locationX, locationY);
        const atBoundary = angleRef.current <= 0.01 || angleRef.current >= MAX_ANGLE - 0.01;
        wedgeLockRef.current = atBoundary && isInTopWedge(lastTouchAngleRef.current);
      },

      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const currentTouchAngle = angleFromTouch(locationX, locationY);
        const inWedge = isInTopWedge(currentTouchAngle);
        const lastAngle = angleRef.current;

        if (wedgeLockRef.current && inWedge) return;

        if (wedgeLockRef.current && !inWedge) {
          wedgeLockRef.current = false;
          if (currentTouchAngle > 0 && currentTouchAngle < 180) {
            lastTouchAngleRef.current = WEDGE_HALF;
          } else {
            lastTouchAngleRef.current = 360 - WEDGE_HALF;
          }
        }

        let delta = wrapDelta(currentTouchAngle - lastTouchAngleRef.current);
        if (Math.abs(delta) > 90) {
          lastTouchAngleRef.current = currentTouchAngle;
          return;
        }

        let newAngle = lastAngle + delta;
        newAngle = Math.max(0, Math.min(newAngle, MAX_ANGLE));
        lastTouchAngleRef.current = currentTouchAngle;

        if (Math.abs(newAngle - lastAngle) < 0.01) return;

        if (newAngle <= 0.01 || newAngle >= MAX_ANGLE - 0.01) {
          if (isInTopWedge(currentTouchAngle)) {
            wedgeLockRef.current = true;
          }
        }

        angleRef.current = newAngle;
        setAngle(newAngle);

        const newMin = Math.round(newAngle / DEG_PER_MIN);
        if (newMin !== lastReportedMinRef.current) {
          lastReportedMinRef.current = newMin;
          onMinutesChange(newMin);
        }
      },

      onPanResponderRelease: () => {
        wedgeLockRef.current = false;
      },
      onPanResponderTerminate: () => {
        wedgeLockRef.current = false;
      },
    })
  ).current;

  return (
    <DialView
      size={size}
      strokeWidth={strokeWidth}
      angle={angle}
      panHandlers={panResponder.panHandlers}
      showTicks
    />
  );
}

/* ---------- MAIN COMPONENT ---------- */
export default function OvalTimerDial({
  size = 220,
  strokeWidth = 12,
  onChange,
  isRunning = false,
  isAlarm = false,
  duration = null,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingMinutes, setPendingMinutes] = useState(duration || 0);
  const [dialKey, setDialKey] = useState(0);

  const displayAngle = Math.min(((duration || 0) / MAX_MINUTES) * 360, MAX_ANGLE);
  const editSize = Math.min(SCREEN_WIDTH - 48, 340);

  const isDisabled = isRunning || isAlarm;

  const openEditor = () => {
    if (isDisabled) return;
    setPendingMinutes(duration || 0);
    setDialKey(k => k + 1);
    setModalVisible(true);
  };

  const handleConfirm = () => {
    setModalVisible(false);
    onChange?.(pendingMinutes);
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  // Dışarıdan (preset / ± buton) değer atayınca dial remount edilir
  const setPendingExternal = (newMin) => {
    const clamped = Math.max(0, Math.min(MAX_MINUTES, newMin));
    setPendingMinutes(clamped);
    setDialKey(k => k + 1);
  };

  const showHours = pendingMinutes >= 60;
  const hh = Math.floor(pendingMinutes / 60);
  const mm = pendingMinutes % 60;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={openEditor}
        disabled={isDisabled}
        style={isDisabled && { opacity: 0.5 }}
      >
        <DialView size={size} strokeWidth={strokeWidth} angle={displayAngle} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Dial + merkez zaman göstergesi */}
            <View style={{ width: editSize, height: editSize }}>
              <EditableDial
                key={dialKey}
                size={editSize}
                strokeWidth={strokeWidth + 2}
                initialMinutes={pendingMinutes}
                onMinutesChange={setPendingMinutes}
              />
              <View
                style={[StyleSheet.absoluteFillObject, styles.centerTimeWrap]}
                pointerEvents="none"
              >
                {showHours ? (
                  <Text style={styles.centerTimeMain}>
                    {hh}
                    <Text style={styles.centerTimeSep}>:</Text>
                    {String(mm).padStart(2, '0')}
                  </Text>
                ) : (
                  <Text style={styles.centerTimeMain}>{pendingMinutes}</Text>
                )}
                <Text style={styles.centerTimeUnit}>
                  {showHours ? 'saat' : 'dakika'}
                </Text>
              </View>
            </View>

            {/* ±1 ince ayar */}
            <View style={styles.fineTuneRow}>
              <TouchableOpacity
                style={[styles.fineBtn, pendingMinutes <= 0 && styles.fineBtnDisabled]}
                onPress={() => setPendingExternal(pendingMinutes - 1)}
                disabled={pendingMinutes <= 0}
                activeOpacity={0.7}
              >
                <Text style={[styles.fineBtnText, pendingMinutes <= 0 && styles.fineBtnTextDisabled]}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fineBtn, pendingMinutes >= MAX_MINUTES && styles.fineBtnDisabled]}
                onPress={() => setPendingExternal(pendingMinutes + 1)}
                disabled={pendingMinutes >= MAX_MINUTES}
                activeOpacity={0.7}
              >
                <Text style={[styles.fineBtnText, pendingMinutes >= MAX_MINUTES && styles.fineBtnTextDisabled]}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Hızlı preset'ler */}
            <View style={styles.presetRow}>
              {PRESETS.map(m => {
                const active = pendingMinutes === m;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.presetChip, active && styles.presetChipActive]}
                    onPress={() => setPendingExternal(m)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* İptal / onay */}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>✕</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
                <Text style={styles.confirmBtnText}>✓</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  centerTimeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTimeMain: {
    fontSize: 68,
    fontWeight: '700',
    color: '#1976D2',
    lineHeight: 76,
    includeFontPadding: false,
    letterSpacing: -1,
  },
  centerTimeSep: {
    fontSize: 60,
    color: '#90CAF9',
    fontWeight: '600',
  },
  centerTimeUnit: {
    fontSize: 13,
    color: '#90A4AE',
    marginTop: 6,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  fineTuneRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 24,
  },
  fineBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#BBDEFB',
  },
  fineBtnDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  fineBtnText: {
    fontSize: 30,
    color: '#1976D2',
    fontWeight: '600',
    lineHeight: 32,
    includeFontPadding: false,
  },
  fineBtnTextDisabled: {
    color: '#CCC',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 18,
    alignSelf: 'stretch',
  },
  presetChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E0E4E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipActive: {
    backgroundColor: '#2196F3',
    borderColor: '#1976D2',
  },
  presetChipText: {
    fontSize: 14,
    color: '#546E7A',
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 28,
    marginTop: 22,
  },
  cancelBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  cancelBtnText: {
    fontSize: 24,
    color: '#888',
    fontWeight: '700',
  },
  confirmBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmBtnText: {
    fontSize: 26,
    color: '#fff',
    fontWeight: '700',
  },
});
