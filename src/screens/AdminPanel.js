import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Button,
    FlatList,
    Image,
    Alert,
    TouchableOpacity,
    Modal,
    ScrollView,
    DeviceEventEmitter,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet, apiPost, apiPatch, apiDel } from '../api';

const SEGMENTS = [
    { key: 'budget', label: 'ประหยัด' },
    { key: 'midrange', label: 'ระดับกลาง' },
    { key: 'flagship', label: 'ระดับท็อป' },
];

const SPEC_FIELDS = [
    { key: 'cpu', label: 'CPU' },
    { key: 'gpu', label: 'GPU' },
    { key: 'display_size', label: 'ขนาดหน้าจอ' },
    { key: 'display_type', label: 'ประเภทจอ' },
    { key: 'ram', label: 'RAM' },
    { key: 'rom', label: 'ROM' },
    { key: 'battery', label: 'แบตเตอรี่' },
];

export default function AdminPanelScreen() {
    const [tab, setTab] = useState('products'); // 'products' | 'users'
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['bottom']}>
            <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 0 }}>
                <View style={{ flexDirection: 'row', margin: 16 }}>
                    <TouchableOpacity
                        onPress={() => setTab('products')}
                        style={{
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            backgroundColor: tab === 'products' ? '#111' : '#e5e7eb',
                            borderRadius: 8,
                            marginRight: 8,
                        }}
                    >
                        <Text style={{ color: tab === 'products' ? '#fff' : '#111' }}>Products</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setTab('users')}
                        style={{
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            backgroundColor: tab === 'users' ? '#111' : '#e5e7eb',
                            borderRadius: 8,
                        }}
                    >
                        <Text style={{ color: tab === 'users' ? '#fff' : '#111' }}>Users</Text>
                    </TouchableOpacity>
                </View>
                {tab === 'products' ? <AdminProducts /> : <AdminUsers />}
            </View>
        </SafeAreaView>
    );
}

function AdminProducts() {
    const createEmptyForm = () => ({
        product_name: '',
        segment: 'midrange',
        image_base64: null,
        spec_list: { cpu: '', gpu: '', display_size: '', display_type: '', ram: '', rom: '', battery: '' },
    });

    const [list, setList] = useState([]);
    const [productQuery, setProductQuery] = useState('');

    const [segSort, setSegSort] = useState('asc'); // 'asc' = budget→midrange→flagship, 'desc' = flagship→midrange→budget

    // Modal เพิ่มสมาร์ทโฟน
    const [addVisible, setAddVisible] = useState(false);
    const [addForm, setAddForm] = useState(createEmptyForm());

    // Modal แก้ไขสมาร์ทโฟน
    const [editVisible, setEditVisible] = useState(false);
    const [editId, setEditId] = useState(null);
    const [editForm, setEditForm] = useState(createEmptyForm());

    const load = async () => {
        const data = await apiGet('/products');
        setList(data || []);
    };
    useEffect(() => { load(); }, []);

    const Chip = ({ active, label, onPress }) => (
        <TouchableOpacity
            onPress={onPress}
            style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: active ? '#111' : '#f3f4f6',
                borderRadius: 999,
                marginRight: 8,
                borderWidth: active ? 0 : 1,
                borderColor: '#e5e7eb',
            }}
        >
            <Text style={{ color: active ? '#fff' : '#111' }}>{label}</Text>
        </TouchableOpacity>
    );

    const SmallBtn = ({ title, onPress, type = 'primary', style }) => {
        const bg =
            type === 'primary' ? '#111' :
                type === 'danger' ? '#ef4444' :
                    type === 'secondary' ? '#f3f4f6' :
                        type === 'safe' ? '#57c449ff' : '#e5e7eb';
        const color = type === 'primary' ? '#fff' : '#111';
        return (
            <TouchableOpacity
                onPress={onPress}
                style={[{ paddingVertical: 10, paddingHorizontal: 12, backgroundColor: bg, borderRadius: 8 }, style]}
            >
                <Text style={{ color, fontWeight: '600' }}>{title}</Text>
            </TouchableOpacity>
        );
    };

    // ---------- Add Modal handlers ----------
    const openAdd = () => {
        setAddForm(createEmptyForm());
        setAddVisible(true);
    };

    const pickImageAdd = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8 });
        if (!res.canceled && res.assets?.[0]?.base64) {
            setAddForm(prev => ({ ...prev, image_base64: res.assets[0].base64 }));
        }
    };

    const saveAdd = async () => {
        if (!addForm.product_name) return Alert.alert('กรอกชื่อสมาร์ทโฟน');
        await apiPost('/products', addForm);
        DeviceEventEmitter.emit('PRODUCTS_UPDATED');
        setAddVisible(false);
        setAddForm(createEmptyForm());
        load();
    };

    const clearAddForm = () => setAddForm(createEmptyForm());

    // ---------- Edit Modal handlers ----------
    const openEdit = (item) => {
        setEditId(item.id);
        setEditForm({
            product_name: item.product_name,
            segment: item.segment,
            image_base64: item.image_base64 || null,
            spec_list: { ...item.spec_list },
        });
        setEditVisible(true);
    };

    const pickImageEdit = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8 });
        if (!res.canceled && res.assets?.[0]?.base64) {
            setEditForm(prev => ({ ...prev, image_base64: res.assets[0].base64 }));
        }
    };

    const saveEdit = async () => {
        if (!editForm.product_name) return Alert.alert('กรอกชื่อสมาร์ทโฟน');
        await apiPatch(`/products/${editId}`, editForm);
        DeviceEventEmitter.emit('PRODUCTS_UPDATED');
        setEditVisible(false);
        setEditId(null);
        setEditForm(createEmptyForm());
        load();
    };

    const del = async (item) => {
        Alert.alert('ยืนยันลบมือถือ', `ลบ ${item.product_name}?`, [
            { text: 'ยกเลิก', style: 'cancel' },
            {
                text: 'ลบ',
                style: 'destructive',
                onPress: async () => {
                    await apiDel(`/products/${item.id}`);
                    DeviceEventEmitter.emit('PRODUCTS_UPDATED');
                    load();
                }
            }
        ]);
    };

    const filtered = useMemo(() => {
        const q = productQuery.trim().toLowerCase();
        if (!q) return list;
        return list.filter(i =>
            // i.product_name?.toLowerCase().includes(q)
            i.product_name?.toLowerCase().includes(q) ||
            i.segment?.toLowerCase().includes(q)
        );
    }, [list, productQuery]);

    const sorted = useMemo(() => {
        const rankAsc = { budget: 0, midrange: 1, flagship: 2 };
        const rankDesc = { flagship: 0, midrange: 1, budget: 2 };
        const rank = segSort === 'asc' ? rankAsc : rankDesc;

        return [...filtered].sort((a, b) => {
            const ra = rank[a.segment] ?? 99;
            const rb = rank[b.segment] ?? 99;
            return ra - rb;
        });
    }, [filtered, segSort]);


    return (
        <View style={{ flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 }}>
            {/* แถวปุ่มเพิ่มสมาร์ทโฟน + ช่องค้นหา */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 0, marginBottom: 8 }}>
                <TextInput
                    placeholder="ค้นหาชื่อสมาร์ทโฟนค้นหา หรือ ระดับสมาร์ทโฟน"
                    value={productQuery}
                    onChangeText={setProductQuery}
                    style={{
                        flex: 1,
                        borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8,
                        padding: 10, marginRight: 10, backgroundColor: '#fff'
                    }}
                />
                <SmallBtn title="เพิ่ม" onPress={openAdd} type="safe" />
            </View>

            {/* ปุ่มเรียง: ย้ายลงบรรทัดใหม่ */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <SmallBtn
                    title={segSort === 'asc' ? 'เรียงจาก: ระดับต่ำไปสูง' : 'เรียงจาก: ระดับสูงไปต่ำ'}
                    onPress={() => setSegSort(s => (s === 'asc' ? 'desc' : 'asc'))}
                    type="secondary"
                />
            </View>

            {/* รายการสมาร์ทโฟน */}
            <FlatList
                data={sorted}
                keyExtractor={(i) => String(i.id)}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#eee' }} />}
                renderItem={({ item }) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                        {item.image_base64 ? (
                            <Image source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }} style={{ width: 48, height: 48, borderRadius: 8, marginRight: 8 }} />
                        ) : (
                            <View style={{ width: 48, height: 48, borderRadius: 8, marginRight: 8, backgroundColor: '#e5e7eb' }} />
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: '600' }}>{item.product_name}</Text>
                            <Text style={{ color: '#6b7280' }}>{item.segment}</Text>
                        </View>
                        <SmallBtn title="แก้ไข" onPress={() => openEdit(item)} style={{ marginRight: 8 }} />
                        <SmallBtn title="ลบมือถือ" onPress={() => del(item)} type="danger" />
                    </View>
                )}
            />

            {/* --------- Add Product Modal --------- */}
            <Modal
                visible={addVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setAddVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 12, paddingTop: 12, paddingHorizontal: 16, paddingBottom: 8, maxHeight: '92%' }}>
                        {/* Header + ปุ่มกากบาท */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={{ flex: 1, fontSize: 18, fontWeight: '700' }}>เพิ่มสมาร์ทโฟน</Text>
                            <TouchableOpacity onPress={() => setAddVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Text style={{ fontSize: 22 }}>×</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <TextInput
                                placeholder="ชื่อสมาร์ทโฟน"
                                value={addForm.product_name}
                                onChangeText={(t) => setAddForm(p => ({ ...p, product_name: t }))}
                                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: '#fff' }}
                            />

                            <Text style={{ marginTop: 4, marginBottom: 6 }}>ช่วงราคา/ระดับ</Text>
                            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                                {SEGMENTS.map(s => (
                                    <Chip
                                        key={s.key}
                                        label={s.label}
                                        active={addForm.segment === s.key}
                                        onPress={() => setAddForm(p => ({ ...p, segment: s.key }))}
                                    />
                                ))}
                            </View>

                            {SPEC_FIELDS.map(({ key, label }) => (
                                <TextInput
                                    key={key}
                                    placeholder={label}
                                    value={addForm.spec_list[key]}
                                    onChangeText={(t) => setAddForm(p => ({ ...p, spec_list: { ...p.spec_list, [key]: t } }))}
                                    style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginBottom: 8, backgroundColor: '#fff' }}
                                />
                            ))}

                            {addForm.image_base64 ? (
                                <Image
                                    source={{ uri: `data:image/jpeg;base64,${addForm.image_base64}` }}
                                    style={{ width: 96, height: 96, borderRadius: 12, marginBottom: 10 }}
                                />
                            ) : null}

                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4, marginBottom: 8 }}>
                                <SmallBtn title="เลือกรูปภาพ" onPress={pickImageAdd} type="primary" style={{ marginRight: 8, marginBottom: 8 }} />
                                <SmallBtn title="เพิ่มสมาร์ทโฟน" onPress={saveAdd} type="safe" style={{ marginRight: 8, marginBottom: 8 }} />
                                <SmallBtn title="ล้างฟอร์ม" onPress={clearAddForm} type="secondary" style={{ marginBottom: 8 }} />
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* --------- Edit Product Modal --------- */}
            <Modal
                visible={editVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setEditVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 12, paddingTop: 12, paddingHorizontal: 16, paddingBottom: 8, maxHeight: '92%' }}>
                        {/* Header + ปุ่มกากบาท */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={{ flex: 1, fontSize: 18, fontWeight: '700' }}>แก้ไขสมาร์ทโฟน</Text>
                            <TouchableOpacity onPress={() => setEditVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Text style={{ fontSize: 22 }}>×</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <TextInput
                                placeholder="ชื่อสมาร์ทโฟน"
                                value={editForm.product_name}
                                onChangeText={(t) => setEditForm(p => ({ ...p, product_name: t }))}
                                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: '#fff' }}
                            />

                            <Text style={{ marginTop: 4, marginBottom: 6 }}>ช่วงราคา/ระดับ</Text>
                            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                                {SEGMENTS.map(s => (
                                    <TouchableOpacity
                                        key={s.key}
                                        onPress={() => setEditForm(p => ({ ...p, segment: s.key }))}
                                        style={{
                                            paddingVertical: 8,
                                            paddingHorizontal: 12,
                                            backgroundColor: editForm.segment === s.key ? '#111' : '#f3f4f6',
                                            borderRadius: 999,
                                            marginRight: 8,
                                            borderWidth: editForm.segment === s.key ? 0 : 1,
                                            borderColor: '#e5e7eb',
                                        }}
                                    >
                                        <Text style={{ color: editForm.segment === s.key ? '#fff' : '#111' }}>{s.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {SPEC_FIELDS.map(({ key, label }) => (
                                <TextInput
                                    key={key}
                                    placeholder={label}
                                    value={editForm.spec_list[key]}
                                    onChangeText={(t) => setEditForm(p => ({ ...p, spec_list: { ...p.spec_list, [key]: t } }))}
                                    style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginBottom: 8, backgroundColor: '#fff' }}
                                />
                            ))}

                            {editForm.image_base64 ? (
                                <Image
                                    source={{ uri: `data:image/jpeg;base64,${editForm.image_base64}` }}
                                    style={{ width: 96, height: 96, borderRadius: 12, marginBottom: 10 }}
                                />
                            ) : null}

                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4, marginBottom: 8 }}>
                                <SmallBtn title="เลือกรูปภาพ" onPress={pickImageEdit} type="primary" style={{ marginRight: 8, marginBottom: 8 }} />
                                <SmallBtn title="บันทึกการแก้ไข" onPress={saveEdit} type="safe" style={{ marginRight: 8, marginBottom: 8 }} />
                                <SmallBtn title="ยกเลิก" onPress={() => setEditVisible(false)} type="secondary" style={{ marginBottom: 8 }} />
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}


/* ===================== USERS SECTION (UPDATED WITH ROLE SORT + DUPLICATE CHECK) ===================== */

function AdminUsers() {
    const [list, setList] = useState([]);
    const [query, setQuery] = useState('');
    const [roleSort, setRoleSort] = useState('admin-first'); // 'admin-first' | 'user-first'

    // Add modal
    const [addVisible, setAddVisible] = useState(false);
    const createAddForm = () => ({
        username: '',
        password: '',
        role_type: 'user',
        img_profile_base64: null,
    });
    const [addForm, setAddForm] = useState(createAddForm());

    // Edit modal
    const [editVisible, setEditVisible] = useState(false);
    const [editId, setEditId] = useState(null);
    const createEditForm = () => ({
        username: '',
        role_type: 'user',
        img_profile_base64: null,
        password: '', // ใส่เมื่ออยากเปลี่ยนรหัสผ่าน (ไม่บังคับ)
    });
    const [editForm, setEditForm] = useState(createEditForm());

    const load = async () => { setList((await apiGet('/users')) || []); };
    useEffect(() => { load(); }, []);

    const SmallBtn = ({ title, onPress, type = 'primary', style }) => {
        const bg =
            type === 'primary' ? '#111' :
                type === 'danger' ? '#ef4444' :
                    type === 'secondary' ? '#f3f4f6' :
                        type === 'safe' ? '#57c449ff' : '#e5e7eb';
        const color = type === 'primary' ? '#fff' : '#111';
        return (
            <TouchableOpacity
                onPress={onPress}
                style={[{ paddingVertical: 10, paddingHorizontal: 12, backgroundColor: bg, borderRadius: 8 }, style]}
            >
                <Text style={{ color, fontWeight: '600' }}>{title}</Text>
            </TouchableOpacity>
        );
    };

    /** DropDown (pure RN) สำหรับ role */
    const RoleDropdown = ({ value, onChange }) => {
        const [open, setOpen] = useState(false);
        const currentLabel = value === 'admin' ? 'admin' : 'user';
        return (
            <View style={{ marginBottom: 10 }}>
                <TouchableOpacity
                    onPress={() => setOpen(o => !o)}
                    style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, backgroundColor: '#fff' }}
                >
                    <Text style={{ color: '#111' }}>บทบาท: {currentLabel}</Text>
                </TouchableOpacity>
                {open && (
                    <View style={{ marginTop: 6, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, backgroundColor: '#fff' }}>
                        {['user', 'admin'].map(opt => (
                            <TouchableOpacity
                                key={opt}
                                onPress={() => { onChange(opt); setOpen(false); }}
                                style={{ padding: 10, borderBottomWidth: opt === 'admin' ? 0 : 1, borderColor: '#eee' }}
                            >
                                <Text>{opt}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    // ---------- Add handlers ----------
    const openAdd = () => { setAddForm(createAddForm()); setAddVisible(true); };

    const pickProfileAdd = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8 });
        if (!res.canceled && res.assets?.[0]?.base64) {
            setAddForm(p => ({ ...p, img_profile_base64: res.assets[0].base64 }));
        }
    };

    const saveAdd = async () => {
        const username = (addForm.username || '').trim();
        const password = addForm.password || '';
        if (!username) return Alert.alert('กรอก username');
        if (!password) return Alert.alert('กรอกรหัสผ่าน');

        try {
            const exist = await apiGet(`/users?username=${encodeURIComponent(username)}`);
            const duplicated = Array.isArray(exist) && exist.some(
                u => (u?.username || '').trim().toLowerCase() === username.toLowerCase()
            );
            if (duplicated) {
                Alert.alert('เพิ่มผู้ใช้ไม่สำเร็จ', 'มีชื่อผู้ใช้นี้ในระบบแล้ว โปรดใช้ชื่ออื่น');
                return;
            }

            await apiPost('/users', { ...addForm, username });
            setAddVisible(false);
            setAddForm(createAddForm());
            load();
        } catch (e) {
            Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเพิ่มผู้ใช้ได้');
        }
    };

    const clearAdd = () => setAddForm(createAddForm());

    // ---------- Edit handlers ----------
    const openEdit = (u) => {
        setEditId(u.id);
        setEditForm({
            username: u.username,
            role_type: u.role_type || 'user',
            img_profile_base64: u.img_profile_base64 || null,
            password: '',
        });
        setEditVisible(true);
    };

    const pickProfileEdit = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8 });
        if (!res.canceled && res.assets?.[0]?.base64) {
            setEditForm(p => ({ ...p, img_profile_base64: res.assets[0].base64 }));
        }
    };

    const saveEdit = async () => {
        const username = (editForm.username || '').trim();
        if (!username) return Alert.alert('กรอก username');

        try {
            // ดึงรายการที่ชื่อเดียวกัน แล้วเช็คว่า id ไม่ใช่ของที่กำลังแก้
            const exist = await apiGet(`/users?username=${encodeURIComponent(username)}`);
            const duplicated = Array.isArray(exist) && exist.some(
                u => (u?.username || '').trim().toLowerCase() === username.toLowerCase() && String(u?.id) !== String(editId)
            );
            if (duplicated) {
                Alert.alert('บันทึกไม่สำเร็จ', 'มีชื่อผู้ใช้นี้ในระบบแล้ว โปรดใช้ชื่ออื่น');
                return;
            }

            const payload = {
                username,
                role_type: editForm.role_type,
                img_profile_base64: editForm.img_profile_base64,
            };
            if (editForm.password) payload.password = editForm.password;

            await apiPatch(`/users/${editId}`, payload);
            setEditVisible(false);
            setEditId(null);
            setEditForm(createEditForm());
            load();
        } catch (e) {
            Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกการแก้ไขได้');
        }
    };

    const delUser = async (user) => {
        Alert.alert('ยืนยันลบผู้ใช้', `ลบ ${user.username}?`, [
            { text: 'ยกเลิก', style: 'cancel' },
            { text: 'ลบ', style: 'destructive', onPress: async () => { await apiDel(`/users/${user.id}`); load(); } }
        ]);
    };

    // คัดกรองตามคำค้น
    const filtered = list.filter(u => u.username?.toLowerCase().includes((query || '').toLowerCase()));

    // จัดเรียงตามบทบาท (admin ก่อน หรือ user ก่อน)
    const sortedUsers = useMemo(() => {
        const rank = roleSort === 'admin-first' ? { admin: 0, user: 1 } : { user: 0, admin: 1 };
        return [...filtered].sort((a, b) => {
            const ra = rank[a.role_type] ?? 99;
            const rb = rank[b.role_type] ?? 99;
            if (ra !== rb) return ra - rb;
            return (a.username || '').localeCompare(b.username || '');
        });
    }, [filtered, roleSort]);

    return (

        <View style={{ flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 }}>
            {/* แถวปุ่มเพิ่มสมาร์ทโฟน + ช่องค้นหา */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 0, marginBottom: 8 }}>
                <TextInput
                    placeholder="ค้นหา username"
                    value={query}
                    onChangeText={setQuery}
                    style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginRight: 10, backgroundColor: '#fff' }}
                />
                <SmallBtn title="เพิ่ม" onPress={openAdd} type='safe'/>
            </View>

            {/* ปุ่มเรียงบทบาท: ย้ายลงบรรทัดใหม่ */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <SmallBtn
                    title={roleSort === 'admin-first' ? 'เรียงจาก: admin ไป user' : 'เรียงจาก: user ไป admin'}
                    onPress={() => setRoleSort(s => (s === 'admin-first' ? 'user-first' : 'admin-first'))}
                    type="secondary"
                />
            </View>

            <FlatList
                data={sortedUsers}
                keyExtractor={(i) => String(i.id)}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#eee' }} />}
                renderItem={({ item }) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                        {item.img_profile_base64 ? (
                            <Image source={{ uri: `data:image/jpeg;base64,${item.img_profile_base64}` }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 8 }} />
                        ) : (
                            <View style={{ width: 44, height: 44, borderRadius: 22, marginRight: 8, backgroundColor: '#e5e7eb' }} />
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: '600' }}>{item.username}</Text>
                            <Text style={{ color: '#6b7280' }}>{item.role_type}</Text>
                        </View>
                        <SmallBtn title="แก้ไข" onPress={() => openEdit(item)} style={{ marginRight: 8 }} />
                        <SmallBtn title="ลบผู้ใช้" onPress={() => delUser(item)} type="danger" />
                    </View>
                )}
            />

            {/* --------- Add User Modal --------- */}
            <Modal
                visible={addVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setAddVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 12, paddingTop: 12, paddingHorizontal: 16, paddingBottom: 8, maxHeight: '92%' }}>
                        {/* Header + ปุ่มกากบาท */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={{ flex: 1, fontSize: 18, fontWeight: '700' }}>เพิ่มผู้ใช้</Text>
                            <TouchableOpacity onPress={() => setAddVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Text style={{ fontSize: 22 }}>×</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <TextInput
                                placeholder="username"
                                value={addForm.username}
                                onChangeText={t => setAddForm(p => ({ ...p, username: t }))}
                                autoCapitalize="none"
                                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: '#fff' }}
                            />
                            <TextInput
                                placeholder="password"
                                value={addForm.password}
                                onChangeText={t => setAddForm(p => ({ ...p, password: t }))}
                                secureTextEntry
                                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: '#fff' }}
                            />
                            <RoleDropdown value={addForm.role_type} onChange={(role) => setAddForm(p => ({ ...p, role_type: role }))} />

                            {addForm.img_profile_base64 ? (
                                <Image source={{ uri: `data:image/jpeg;base64,${addForm.img_profile_base64}` }} style={{ width: 96, height: 96, borderRadius: 12, marginBottom: 10 }} />
                            ) : null}

                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4, marginBottom: 8 }}>
                                <SmallBtn title="เลือกรูปภาพ" onPress={pickProfileAdd} type="primary" style={{ marginRight: 8, marginBottom: 8 }} />
                                <SmallBtn title="บันทึก" onPress={saveAdd} type="safe" style={{ marginRight: 8, marginBottom: 8 }} />
                                <SmallBtn title="ล้างฟอร์ม" onPress={clearAdd} type="secondary" style={{ marginBottom: 8 }} />
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* --------- Edit User Modal --------- */}
            <Modal
                visible={editVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setEditVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 12, paddingTop: 12, paddingHorizontal: 16, paddingBottom: 8, maxHeight: '92%' }}>
                        {/* Header + ปุ่มกากบาท */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={{ flex: 1, fontSize: 18, fontWeight: '700' }}>แก้ไขผู้ใช้</Text>
                            <TouchableOpacity onPress={() => setEditVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Text style={{ fontSize: 22 }}>×</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <TextInput
                                placeholder="username"
                                value={editForm.username}
                                onChangeText={t => setEditForm(p => ({ ...p, username: t }))}
                                autoCapitalize="none"
                                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: '#fff' }}
                            />
                            <TextInput
                                placeholder="ตั้งรหัสผ่านใหม่ (ไม่บังคับ)"
                                value={editForm.password}
                                onChangeText={t => setEditForm(p => ({ ...p, password: t }))}
                                secureTextEntry
                                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: '#fff' }}
                            />
                            <RoleDropdown value={editForm.role_type} onChange={(role) => setEditForm(p => ({ ...p, role_type: role }))} />

                            {editForm.img_profile_base64 ? (
                                <Image source={{ uri: `data:image/jpeg;base64,${editForm.img_profile_base64}` }} style={{ width: 96, height: 96, borderRadius: 12, marginBottom: 10 }} />
                            ) : null}

                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4, marginBottom: 8 }}>
                                <SmallBtn title="เลือกรูปภาพ" onPress={pickProfileEdit} type="primary" style={{ marginRight: 8, marginBottom: 8 }} />
                                <SmallBtn title="บันทึกการแก้ไข" onPress={saveEdit} type="safe" style={{ marginRight: 8, marginBottom: 8 }} />
                                <SmallBtn title="ยกเลิก" onPress={() => setEditVisible(false)} type="secondary" style={{ marginBottom: 8 }} />
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
