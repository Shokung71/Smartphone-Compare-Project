// src/screens/ProductDetail.js
import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '../api';
import { FontAwesome5 } from '@expo/vector-icons';

function SpecRow({ icon, label, value }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' }}>
      <FontAwesome5 name={icon} size={18} style={{ width: 24, marginRight: 8 }} />
      <Text style={{ width: 120, fontWeight: '600' }}>{label}</Text>
      <Text style={{ flex: 1 }}>{value || '-'}</Text>
    </View>
  );
}

export default function ProductDetailScreen({ route }) {
  // รองรับทั้งส่งมาทั้ง object เต็ม ๆ หรือส่งแค่ id
  const passedItem = route.params?.item || null;
  const id = route.params?.id || passedItem?.id;

  const [item, setItem] = useState(passedItem);

  useEffect(() => {
    let mounted = true;
    const fetchById = async () => {
      if (!id) return;
      const res = await apiGet(`/products/${id}`);
      if (mounted && res) setItem(res);
    };
    // ถ้าไม่ได้ส่ง object มาเต็ม ๆ ให้โหลดจาก id
    if (!passedItem) fetchById();
    return () => { mounted = false; };
  }, [id]);

  if (!item) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>กำลังโหลดข้อมูลสินค้า...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const specs = item.spec_list || {};
  const rows = [
    { icon: 'microchip', label: 'CPU', value: specs.cpu },
    { icon: 'microchip', label: 'GPU', value: specs.gpu },
    { icon: 'mobile-alt', label: 'ขนาดหน้าจอ', value: specs.display_size },
    { icon: 'tv', label: 'ประเภทจอ', value: specs.display_type },
    { icon: 'memory', label: 'RAM', value: specs.ram },
    { icon: 'hdd', label: 'ROM', value: specs.rom },
    { icon: 'battery-half', label: 'แบตเตอรี่', value: specs.battery },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          {item.image_base64 ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
              style={{ width: 160, height: 160, borderRadius: 12, marginBottom: 12 }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ width: 160, height: 160, borderRadius: 12, backgroundColor: '#e5e7eb', marginBottom: 12 }} />
          )}
          <Text style={{ fontSize: 20, fontWeight: '700', textAlign: 'center' }}>{item.product_name}</Text>
          <Text style={{ marginTop: 4, color: '#6b7280' }}>{item.segment}</Text>
        </View>

        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12 }}>
          {rows.map((r) => (
            <SpecRow key={r.label} icon={r.icon} label={r.label} value={r.value} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
