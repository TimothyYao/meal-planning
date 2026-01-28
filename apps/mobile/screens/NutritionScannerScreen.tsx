import { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '@meal-planning/shared';
import { parseNutritionLabel } from '../utils/nutritionParser';
import { safeGoBack } from '../utils/navigation';

export default function NutritionScannerScreen() {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    // Camera permissions are still loading
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => safeGoBack(navigation)} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current && !isProcessing) {
      setIsProcessing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          base64: false,
        });

        if (photo) {
          await processImage(photo.uri);
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to capture image');
        setIsProcessing(false);
      }
    }
  };

  const processImage = async (uri: string) => {
    try {
      // 1. OCR
      const result = await TextRecognition.recognize(uri);
      
      // 2. Parse
      const nutritionData = parseNutritionLabel(result.text);

      if (nutritionData.confidence === 'low' && nutritionData.calories === 0) {
          Alert.alert(
              'No Nutrition Data Found', 
              'Could not detect valid nutrition information. Please try again or enter manually.',
              [
                  { text: 'Try Again', onPress: () => setIsProcessing(false) },
                  { text: 'Enter Manually', onPress: () => {
                      navigation.navigate('AddFood' as never);
                  }}
              ]
          );
          return;
      }

      // 3. Navigate to AddFoodScreen with data
      const scannedFood = {
        name: 'Scanned Food', 
        macros: {
            calories: nutritionData.calories,
            protein: nutritionData.protein,
            carbs: nutritionData.totalCarbohydrate,
            fat: nutritionData.totalFat
        },
        servingSize: 1, 
        servingUnit: nutritionData.servingSize || 'serving',
      };
      
      const dummyFood = {
          ...scannedFood,
          id: 'scanned_' + Date.now(),
          createdAt: new Date(),
          updatedAt: new Date(),
          source: 'scanned'
      };

      // @ts-ignore - navigation types need update
      navigation.navigate('AddFood', { duplicateFood: dummyFood });
      
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Error', 'Failed to extract nutrition data');
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} facing="back">
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => safeGoBack(navigation)} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.title}>Scan Nutrition Label</Text>
          </View>
          
          <View style={styles.guideContainer}>
            <View style={styles.guideBox}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.guideText}>Position label within the frame</Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity 
                style={styles.captureButton} 
                onPress={takePicture}
                disabled={isProcessing}
            >
                {isProcessing ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                ) : (
                    <View style={styles.captureInner} />
                )}
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
  },
  header: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl,
  },
  closeButton: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.xl,
    padding: spacing.xs,
  },
  title: {
    color: 'white',
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: 'white',
    fontSize: fontSize.md,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  permissionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButton: {
      marginTop: 20,
      padding: 10,
  },
  cancelButtonText: {
      color: colors.primary,
      fontSize: fontSize.md,
      textAlign: 'center',
  },
  guideContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
  },
  guideBox: {
      width: 250,
      height: 350,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.5)',
      backgroundColor: 'transparent',
      position: 'relative',
  },
  guideText: {
      color: 'white',
      marginTop: spacing.md,
      fontSize: fontSize.md,
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: spacing.xs,
      borderRadius: 4,
      overflow: 'hidden',
  },
  corner: {
      position: 'absolute',
      width: 20,
      height: 20,
      borderColor: colors.primary,
      borderWidth: 3,
  },
  topLeft: {
      top: -2,
      left: -2,
      borderRightWidth: 0,
      borderBottomWidth: 0,
  },
  topRight: {
      top: -2,
      right: -2,
      borderLeftWidth: 0,
      borderBottomWidth: 0,
  },
  bottomLeft: {
      bottom: -2,
      left: -2,
      borderRightWidth: 0,
      borderTopWidth: 0,
  },
  bottomRight: {
      bottom: -2,
      right: -2,
      borderLeftWidth: 0,
      borderTopWidth: 0,
  },
  controls: {
      paddingBottom: 50,
      alignItems: 'center',
  },
  captureButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255,255,255,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 4,
      borderColor: 'white',
  },
  captureInner: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: 'white',
  },
});
