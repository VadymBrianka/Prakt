import { Alert, Platform } from 'react-native';

export const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title ? title + ': ' : ''}${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export const showConfirm = (title, message, onConfirm) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Скасувати', style: 'cancel' },
      { text: 'Підтвердити', style: 'destructive', onPress: onConfirm }
    ]);
  }
};