// User.js
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  Alert, Modal, ScrollView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { apiGet, apiPost, apiPatch } from '../api';

export default function UserScreen({ navigation }) {
  const [me, setMe] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  // ---- Uncontrolled refs for auth form ----
  const usernameRef = useRef('');
  const passwordRef = useRef('');
  const [formKey, setFormKey] = useState(0); // bump to clear inputs

  const refresh = async () => {
    const str = await AsyncStorage.getItem('session_user');
    setMe(str ? JSON.parse(str) : null);
  };
  useEffect(() => {
    const unsub = navigation.addListener('focus', refresh);
    return unsub;
  }, [navigation]);

  // ---- Auth ----
  const handleLogin = async () => {
    const username = usernameRef.current.trim();
    const password = passwordRef.current;
    if (!username || !password) return Alert.alert('กรุณากรอกข้อมูลให้ครบ');
    const users = await apiGet(`/users?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
    if (users?.length) {
      await AsyncStorage.setItem('session_user', JSON.stringify(users[0]));
      setFormKey(k => k + 1); // clear inputs
      await refresh();        // อัปเดต me ให้เป็นสถานะล็อกอิน
      navigation.navigate('หน้าแรก'); // เด้งไปหน้า Home
    } else {
      Alert.alert('เข้าสู่ระบบไม่สำเร็จ', 'username/password ไม่ถูกต้อง');
    }
  };

  const handleLogout = async () => { await AsyncStorage.removeItem('session_user'); refresh(); };

  // ป้องกัน username ซ้ำตอนสมัครสมาชิก
  const handleRegister = async () => {
    const rawUsername = usernameRef.current;
    const password = passwordRef.current;
    const username = (rawUsername || '').trim();

    if (!username || !password) return Alert.alert('กรอกข้อมูลให้ครบ');

    try {
      const existing = await apiGet(`/users?username=${encodeURIComponent(username)}`);
      const isDuplicate = Array.isArray(existing) && existing.some(
        u => (u?.username || '').trim().toLowerCase() === username.toLowerCase()
      );

      if (isDuplicate) {
        Alert.alert('สมัครไม่สำเร็จ', 'มีชื่อผู้ใช้นี้ในระบบแล้ว โปรดใช้ชื่ออื่น');
        return;
      }

      const payload = { username, password, role_type: 'user', img_profile_base64: null };
      await apiPost('/users', payload);
      Alert.alert('สมัครสำเร็จ', 'โปรดเข้าสู่ระบบ');
      setShowRegister(false);
      setFormKey(k => k + 1); // clear inputs
    } catch (e) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถสมัครสมาชิกได้ โปรดลองใหม่อีกครั้ง');
    }
  };

  // ---- Edit Profile (Modal) ----
  const [editOpen, setEditOpen] = useState(false);
  const [editImgBase64, setEditImgBase64] = useState(null);
  const [saving, setSaving] = useState(false);

  // Uncontrolled refs for edit modal
  const editUsernameRef = useRef('');
  const editPasswordRef = useRef('');
  const [editKey, setEditKey] = useState(0); // remount fields per open

  const openEdit = () => {
    if (!me) return;
    editUsernameRef.current = me.username || '';
    editPasswordRef.current = '';
    setEditImgBase64(me.img_profile_base64 || null);
    setEditKey(k => k + 1); // ensure defaultValue applied
    setEditOpen(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('ต้องการสิทธิ์', 'โปรดอนุญาตเข้าถึงคลังรูปภาพ');
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
      aspect: [1, 1],
    });
    if (!res.canceled) {
      const b64 = res.assets?.[0]?.base64 || null;
      setEditImgBase64(b64);
    }
  };

  const clearAvatar = () => setEditImgBase64(null);

  // ป้องกันเปลี่ยน username ให้ซ้ำกับผู้ใช้อื่น (ยกเว้นของตัวเอง)
  const saveEdit = async () => {
    if (!me) return;
    try {
      setSaving(true);

      const nextUsernameRaw = editUsernameRef.current ?? '';
      const nextUsername = nextUsernameRaw.trim();
      const nextPassword = editPasswordRef.current ?? '';

      if (!nextUsername) {
        Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกชื่อผู้ใช้');
        setSaving(false);
        return;
      }

      const isUsernameChanged =
        nextUsername.toLowerCase() !== (me.username || '').trim().toLowerCase();

      if (isUsernameChanged) {
        // เช็คชื่อซ้ำแบบไม่สนตัวพิมพ์เล็ก-ใหญ่ และต้องไม่ใช่ไอดีของตัวเอง
        const exist = await apiGet(`/users?username=${encodeURIComponent(nextUsername)}`);
        const duplicated =
          Array.isArray(exist) &&
          exist.some(
            u =>
              (u?.username || '').trim().toLowerCase() === nextUsername.toLowerCase() &&
              String(u?.id) !== String(me.id)
          );

        if (duplicated) {
          Alert.alert('บันทึกไม่สำเร็จ', 'มีชื่อผู้ใช้นี้ในระบบแล้ว โปรดใช้ชื่ออื่น');
          setSaving(false);
          return;
        }
      }

      // ผ่านการตรวจสอบ -> เตรียม payload
      const payload = {
        img_profile_base64: editImgBase64 ?? null,
      };
      if (isUsernameChanged) payload.username = nextUsername;
      if (nextPassword) payload.password = nextPassword;

      const updated = await apiPatch(`/users/${me.id}`, payload);
      const nextUser =
        updated || { ...me, ...payload, username: isUsernameChanged ? nextUsername : me.username };

      await AsyncStorage.setItem('session_user', JSON.stringify(nextUser));
      setMe(nextUser);
      setEditOpen(false);
      Alert.alert('บันทึกสำเร็จ', 'อัปเดตข้อมูลโปรไฟล์เรียบร้อย');
    } catch {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setSaving(false);
    }
  };

  // ---- Reusable UI ----
  const Card = ({ children, style }) => (
    <View style={[{
      backgroundColor: '#ffffff',
      borderRadius: 16,
      padding: 16,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    }, style]}>
      {children}
    </View>
  );

  const PrimaryButton = ({ title, onPress, style }) => (
    <TouchableOpacity onPress={onPress} style={[{
      backgroundColor: '#e45353ff',
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
    }, style]}>
      <Text style={{ color: '#ffffffff', fontWeight: '700', fontSize: 16 }}>{title}</Text>
    </TouchableOpacity>
  );

  const PrimaryButton2 = ({ title, onPress, style }) => (
    <TouchableOpacity onPress={onPress} style={[{
      backgroundColor: '#57c449ff',
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
    }, style]}>
      <Text style={{ color: '#ffffffff', fontWeight: '700', fontSize: 16 }}>{title}</Text>
    </TouchableOpacity>
  );

  const PrimaryButton3 = ({ title, onPress, style }) => (
    <TouchableOpacity onPress={onPress} style={[{
      backgroundColor: '#3495f0ff',
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
    }, style]}>
      <Text style={{ color: '#ffffffff', fontWeight: '700', fontSize: 16 }}>{title}</Text>
    </TouchableOpacity>
  );

  const GhostButton = ({ title, onPress, style }) => (
    <TouchableOpacity onPress={onPress} style={[{
      backgroundColor: '#000000ff',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      alignItems: 'center',
    }, style]}>
      <Text style={{ color: '#ffffffff', fontWeight: '700' }}>{title}</Text>
    </TouchableOpacity>
  );

  // ---- Logged-in UI ----
  if (me) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
        >
          {/* Header */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 22, fontWeight: '800' }}>โปรไฟล์ของฉัน</Text>
            <Text style={{ color: '#6b7280', marginTop: 4 }}>ยินดีต้อนรับกลับมา</Text>
          </View>

          {/* Profile Card */}
          <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
            {me.img_profile_base64 ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${me.img_profile_base64}` }}
                style={{ width: 110, height: 110, borderRadius: 64, marginBottom: 12 }}
              />
            ) : (
              <View style={{
                width: 100, height: 100, borderRadius: 60, marginBottom: 12,
                backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center'
              }}>
                <Text style={{ fontSize: 36 }}>👤</Text>
              </View>
            )}

            <Text style={{ fontSize: 20, fontWeight: '800' }}>{me.username}</Text>
            <Text style={{
              marginTop: 4,
              color: '#ffffffff',
              fontWeight: '700',
              backgroundColor: '#888888ff',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999
            }}>
              {me.role_type?.toUpperCase()}
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <GhostButton title="แก้ไขโปรไฟล์" onPress={openEdit} />
              {me.role_type === 'admin' && (
                <GhostButton title="ไปหน้า Admin" onPress={() => navigation.navigate('AdminPanel')} />
              )}
            </View>
          </Card>

          {/* Actions */}
          <Card style={{ marginTop: 16 }}>
            <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: 10 }}>การตั้งค่า</Text>
            <PrimaryButton title="ออกจากระบบ" onPress={handleLogout} />
          </Card>
        </ScrollView>

        {/* Edit Profile Modal */}
        <Modal visible={editOpen} animationType="none" transparent>
          <View style={{
            flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end'
          }}>
            <View style={{
              backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
              paddingBottom: Platform.select({ ios: 30, android: 16 }),
              paddingHorizontal: 16, paddingTop: 12,
            }}>
              {/* Modal header */}
              <View style={{ alignItems: 'center', marginBottom: 6 }}>
                <View style={{
                  width: 42, height: 5, borderRadius: 999, backgroundColor: '#e5e7eb', marginBottom: 6
                }} />
                <Text style={{ fontSize: 18, fontWeight: '800' }}>แก้ไขข้อมูลส่วนตัว</Text>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" removeClippedSubviews={false}>
                {/* Avatar row */}
                <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 12 }}>
                  {editImgBase64 ? (
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${editImgBase64}` }}
                      style={{ width: 110, height: 110, borderRadius: 64, marginBottom: 8 }}
                    />
                  ) : (
                    <View style={{
                      width: 100, height: 100, borderRadius: 60, marginBottom: 8,
                      backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Text style={{ fontSize: 36 }}>👤</Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <GhostButton title="เลือกรูปภาพ" onPress={pickImage} />
                    {editImgBase64 && (
                      <TouchableOpacity
                        onPress={clearAvatar}
                        style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#fee2e2' }}>
                        <Text style={{ color: '#b91c1c', fontWeight: '700' }}>ลบรูป</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Inputs (uncontrolled) */}
                <Text style={{ fontWeight: '700', marginBottom: 6 }}>ชื่อผู้ใช้</Text>
                <TextInput
                  key={`eu-${editKey}`}
                  defaultValue={me?.username || ''}
                  onChangeText={(t) => { editUsernameRef.current = t; }}
                  placeholder="ชื่อผู้ใช้ใหม่"
                  placeholderTextColor="#9ca3af"
                  autoCorrect={false}
                  autoCapitalize="none"
                  autoComplete="off"
                  disableFullscreenUI
                  style={{
                    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, marginBottom: 12
                  }}
                />
                <Text style={{ fontWeight: '700', marginBottom: 6 }}>รหัสผ่านใหม่ (ถ้าเปลี่ยน)</Text>
                <TextInput
                  key={`ep-${editKey}`}
                  defaultValue=""
                  onChangeText={(t) => { editPasswordRef.current = t; }}
                  placeholder="รหัสผ่านใหม่"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={true}
                  autoCorrect={false}
                  autoCapitalize="none"
                  autoComplete="off"
                  disableFullscreenUI
                  keyboardType="default"
                  style={{
                    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, marginBottom: 16
                  }}
                />

                {/* Save / Cancel */}
                <PrimaryButton2
                  title={saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                  onPress={saveEdit}
                  style={{ opacity: saving ? 0.7 : 1 }}
                />
                <TouchableOpacity onPress={() => setEditOpen(false)} style={{ alignItems: 'center', paddingVertical: 12 }}>
                  <Text style={{ color: '#6b7280', fontWeight: '700' }}>ปิด</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ---- Login/Register UI ----
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}
      >
        {/* Header */}
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 4 }}>
            {showRegister ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
          </Text>
          <Text style={{ color: '#6b7280', marginBottom: 14 }}>
            {showRegister ? 'สร้างบัญชีใหม่และเริ่มต้นใช้งาน' : 'ยินดีต้อนรับกลับมา'}
          </Text>
        </View>

        <Card style={{ paddingVertical: 22 }}>
          <Text style={{ fontWeight: '700', marginBottom: 6 }}>Username</Text>
          <TextInput
            key={`u-${formKey}`}
            defaultValue=""
            onChangeText={(t) => { usernameRef.current = t; }}
            placeholder="username"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            disableFullscreenUI
            importantForAutofill="no"
            style={{
              borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, marginBottom: 10
            }}
          />
          <Text style={{ fontWeight: '700', marginBottom: 6 }}>Password</Text>
          <TextInput
            key={`p-${formKey}`}
            defaultValue=""
            onChangeText={(t) => { passwordRef.current = t; }}
            placeholder="password"
            placeholderTextColor="#9ca3af"
            secureTextEntry={true}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            disableFullscreenUI
            importantForAutofill="no"
            keyboardType="default"
            style={{
              borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, marginBottom: 16
            }}
          />

          {showRegister ? (
            <PrimaryButton3 title="สมัครสมาชิก" onPress={handleRegister} />
          ) : (
            <PrimaryButton3 title="เข้าสู่ระบบ" onPress={handleLogin} />
          )}

          <TouchableOpacity onPress={() => Alert.alert('ลืมรหัสผ่าน', 'Demo: โปรดติดต่อผู้ดูแลระบบ')} style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={{ color: '#2563eb', fontWeight: '700' }}>ลืมรหัสผ่าน?</Text>
          </TouchableOpacity>

          <View style={{ marginTop: 14, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setShowRegister(v => !v)}>
              <Text>
                {showRegister ? 'มีบัญชีแล้ว? ' : 'ยังไม่มีบัญชี? '}
                <Text style={{ color: '#2563eb', fontWeight: '800' }}>
                  {showRegister ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
