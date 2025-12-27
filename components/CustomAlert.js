import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

let alertRef = null;

const CustomAlert = () => {
  const [visible, setVisible] = React.useState(false);
  const [config, setConfig] = React.useState({
    title: '',
    message: '',
    buttons: [],
  });

  React.useEffect(() => {
    // alertRef'i hemen set et
    alertRef = {
      show: (alertConfig) => {
        console.log('🔔 CustomAlert gösteriliyor:', alertConfig);
        setConfig(alertConfig);
        setVisible(true);
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      },
      hide: () => {
        setVisible(false);
      },
    };
    
    return () => {
      alertRef = null;
    };
  }, []);

  const handleButtonPress = (button) => {
    if (button.onPress) {
      button.onPress();
    }
    setVisible(false);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          {config.title ? (
            <Text style={styles.title}>{config.title}</Text>
          ) : null}
          {config.message ? (
            <Text style={styles.message}>{config.message}</Text>
          ) : null}
          <View style={styles.buttonContainer}>
            {config.buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  button.style === 'destructive' && styles.destructiveButton,
                  button.style === 'cancel' && styles.cancelButton,
                  config.buttons.length === 1 && styles.singleButton,
                ]}
                onPress={() => handleButtonPress(button)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.buttonText,
                    button.style === 'destructive' && styles.destructiveButtonText,
                    button.style === 'cancel' && styles.cancelButtonText,
                  ]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    ...Platform.select({
      android: {
        elevation: 10,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
    }),
  },
  singleButton: {
    maxWidth: '100%',
  },
  destructiveButton: {
    backgroundColor: '#FF5722',
    ...Platform.select({
      ios: {
        shadowColor: '#FF5722',
      },
    }),
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    ...Platform.select({
      android: {
        elevation: 1,
      },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
      },
    }),
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  destructiveButtonText: {
    color: '#fff',
  },
  cancelButtonText: {
    color: '#666',
  },
});

// Alert API'sini export et
export const showAlert = (title, message, buttons) => {
  console.log('📢 showAlert çağrıldı:', { title, message, buttons, alertRef: !!alertRef });
  
  // alertRef henüz hazır değilse kısa bir süre bekle
  if (!alertRef) {
    console.log('⏳ alertRef henüz hazır değil, bekleniyor...');
    // Retry mekanizması - alertRef hazır olana kadar dene
    let retryCount = 0;
    const maxRetries = 20; // 1 saniye (20 * 50ms)
    
    const retryInterval = setInterval(() => {
      retryCount++;
      if (alertRef) {
        console.log('✅ alertRef hazır, alert gösteriliyor');
        clearInterval(retryInterval);
        alertRef.show({ title, message, buttons });
      } else if (retryCount >= maxRetries) {
        console.error('❌ alertRef hazır olmadı, timeout');
        clearInterval(retryInterval);
      }
    }, 50);
    
    return;
  }
  
  console.log('✅ alertRef hazır, direkt gösteriliyor');
  alertRef.show({ title, message, buttons });
};

export default CustomAlert;

