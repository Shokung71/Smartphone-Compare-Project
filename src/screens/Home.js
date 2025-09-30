// Home.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, Image, TouchableOpacity, StyleSheet, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { apiGet } from '../api';

const SEGMENTS = [
  { key: 'budget', label: 'ประหยัด' },
  { key: 'midrange', label: 'ระดับกลาง' },
  { key: 'flagship', label: 'ระดับท็อป' },
];

// Header Component
function AppHeader({ user, onPressProfile }) {
  return (
    <View style={styles.header}>
      {/* Logo Section - Left */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logoImage}
          resizeMode="cover"
        />
      </View>

      {/* Title Section - Center */}
      <View style={styles.titleContainer}>
        <Text style={styles.headerTitle}>Phone Compare</Text>
      </View>

      {/* User Profile Section - Right */}
      <TouchableOpacity style={styles.profileContainer} onPress={onPressProfile} activeOpacity={0.8}>
        {user?.img_profile_base64 ? (
          <Image
            source={{ uri: `data:image/png;base64,${user.img_profile_base64}` }}
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarIcon}>👤</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// Segment Filter Component
function SegmentFilter({ value, onChange }) {
  return (
    <View style={styles.segmentContainer}>
      {SEGMENTS.map(seg => (
        <TouchableOpacity
          key={seg.key}
          onPress={() => onChange(seg.key)}
          style={[
            styles.segmentButton,
            value === seg.key && styles.segmentButtonActive
          ]}
          activeOpacity={0.9}
        >
          <Text
            style={[
              styles.segmentText,
              value === seg.key && styles.segmentTextActive
            ]}
          >
            {seg.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Product Item Component
function ProductItem({ item, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.productItem} activeOpacity={0.7}>
      {item.image_base64 ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
          style={styles.productImage}
        />
      ) : (
        <View style={styles.productImagePlaceholder}>
          <Text style={styles.placeholderText}>📱</Text>
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.product_name}
        </Text>
        <View style={styles.segmentBadge}>
          <Text style={styles.segmentBadgeText}>{item.segment}</Text>
        </View>
      </View>
      <View style={styles.arrowContainer}>
        <Text style={styles.arrowText}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

// Main Screen Component
export default function HomeScreen({ navigation }) {
  const [segment, setSegment] = useState('flagship');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // user from session
  const [user, setUser] = useState(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiGet(`/products?segment=${segment}`);
      setData(list || []);
    } catch (error) {
      console.error('Error loading products:', error);
      setData([]);
    }
    setLoading(false);
  }, [segment]);

  const loadUserFromSession = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('session_user');
      setUser(raw ? JSON.parse(raw) : null);
    } catch (e) {
      console.warn('Failed to load session_user', e);
      setUser(null);
    }
  }, []);

  // เปลี่ยน segment -> โหลดใหม่
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // รีโหลดเมื่อหน้า Home โฟกัส
  useFocusEffect(
    useCallback(() => {
      loadProducts();
      loadUserFromSession();
    }, [loadProducts, loadUserFromSession])
  );

  // ฟังอีเวนต์จาก AdminPanel -> รีโหลดทันที
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('PRODUCTS_UPDATED', () => {
      loadProducts();
    });
    return () => sub.remove();
  }, [loadProducts]);

  // also run once on mount for user
  useEffect(() => {
    loadUserFromSession();
  }, [loadUserFromSession]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <AppHeader user={user} onPressProfile={() => navigation.navigate('ผู้ใช้')} />

      {/* Content */}
      <View style={styles.content}>
        <SegmentFilter value={segment} onChange={setSegment} />

        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadProducts}
              colors={['#3b82f6']}
              tintColor="#3b82f6"
            />
          }
          renderItem={({ item }) => (
            <ProductItem
              item={item}
              onPress={() => navigation.navigate('ProductDetail', { item })}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  logoContainer: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  logoImage: { width: 48, height: 48 },
  titleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  profileContainer: { width: 44, alignItems: 'flex-end' },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarIcon: { fontSize: 20, color: '#ffffff' },

  // Content Styles
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  // Segment Filter Styles
  segmentContainer: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  segmentButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentButtonActive: { backgroundColor: '#111827', borderColor: '#111827' },
  segmentText: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  segmentTextActive: { color: '#fff' },

  // Product List Styles
  listContent: { paddingBottom: 16 },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  productImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { fontSize: 32 },
  productInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  productName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  segmentBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  segmentBadgeText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  arrowContainer: { marginLeft: 8 },
  arrowText: { fontSize: 28, color: '#d1d5db', fontWeight: '300' },
});
