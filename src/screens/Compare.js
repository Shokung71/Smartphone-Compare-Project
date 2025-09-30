import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '../api';

/**
 * CompareScreen — ปุ่ม "ล้าง" & "ต่างกันเท่านั้น" ย้ายไปคอลัมน์ซ้าย
 * - ปุ่มอยู่ในคอลัมน์ซ้ายของหัวตาราง (ไม่รบกวนพื้นที่รูป)
 * - ยังคงกัน crash Android (ใช้ LayoutAnimation เฉพาะ iOS)
 */

const IS_IOS = Platform.OS === 'ios';
const animate = () => {
  if (IS_IOS) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

// เพิ่มตัวเลือก "all" สำหรับแสดงทั้งหมด
const SEGMENTS = [
  { key: 'budget', label: 'ประหยัด' },
  { key: 'midrange', label: 'ระดับกลาง' },
  { key: 'flagship', label: 'ระดับท็อป' },
  { key: 'all', label: 'ทั้งหมด' }, // << เพิ่มปุ่มใหม่
];

const SPEC_FIELDS = [
  { key: 'cpu', label: 'CPU', numeric: false },
  { key: 'gpu', label: 'GPU', numeric: false },
  { key: 'display_size', label: 'ขนาดหน้าจอ', numeric: true, unit: 'นิ้ว' },
  { key: 'display_type', label: 'ประเภทจอ', numeric: false },
  { key: 'ram', label: 'RAM', numeric: true, unit: 'GB' },
  { key: 'rom', label: 'ROM', numeric: true, unit: 'GB' },
  { key: 'battery', label: 'แบตเตอรี่', numeric: true, unit: 'mAh' },
];

const CARD_WIDTH = 148;
const CARD_HEIGHT = 134;
const SLOT_SIZE = 96; // ภาพหัวตารางใหญ่กำลังดี

// ---- helpers ----
const extractNumber = (val) => {
  if (val == null) return null;
  const s = String(val).replace(/,/g, '');
  const m = s.match(/([0-9]+(?:\.[0-9]+)?)/);
  return m ? parseFloat(m[1]) : null;
};

const isEqualLoose = (a, b) => {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
};

const betterOf = (a, b) => {
  const numA = extractNumber(a);
  const numB = extractNumber(b);
  if (numA == null || numB == null) return 0;
  if (numA === numB) return 0;
  return numA > numB ? -1 : 1; // -1 => A ชนะ, 1 => B ชนะ
};

const meterWidth = (val, max) => {
  if (val == null || max == null || max === 0) return '0%';
  return `${Math.max(6, Math.min(100, Math.round((val / max) * 100)))}%`;
};

function Pill({ active, children, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}>
      <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextInactive]}>{children}</Text>
    </TouchableOpacity>
  );
}

function SegmentFilter({ value, onChange }) {
  return (
    <View style={styles.segmentRow}>
      {SEGMENTS.map(seg => (
        <Pill key={seg.key} active={value === seg.key} onPress={() => onChange(seg.key)}>
          {seg.label}
        </Pill>
      ))}
    </View>
  );
}

function ProductCard({ item, selected, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[styles.card, selected ? styles.cardSelected : null]}>
      {item.image_base64 ? (
        <Image source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]} />
      )}
      <Text style={styles.cardName} numberOfLines={2}>{item.product_name}</Text>
      <View style={[styles.checkDot, selected ? styles.checkDotOn : styles.checkDotOff]} />
    </TouchableOpacity>
  );
}

// หัวตาราง: คอลัมน์ซ้ายเป็นกล่องปุ่ม (ล้าง/ต่างกันเท่านั้น)
function HeaderCells({ A, B, diffOnly, setDiffOnly, onClear }) {
  return (
    <View style={styles.compareHeaderRow}>
      {/* คอลัมน์ซ้าย (ตำแหน่งกรอบสีแดง) */}
      <View style={styles.actionsColLeft}>
        <TouchableOpacity onPress={onClear} disabled={!A && !B} style={[styles.actionBtn, (!A && !B) && styles.actionBtnDisabled]}>
          <Text style={styles.actionBtnText}>ล้าง</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDiffOnly(!diffOnly)} style={[styles.actionBtn, diffOnly && styles.actionBtnActive]}>
          <Text style={[styles.actionBtnText, diffOnly && styles.actionBtnTextActive]}>{diffOnly ? 'แสดงทั้งหมด' : 'ต่างกันเท่านั้น'}</Text>
        </TouchableOpacity>
      </View>

      {/* คอลัมน์รูป A */}
      <View style={styles.headerCell}>
        {A ? (
          <>
            {A.image_base64 ? (
              <Image source={{ uri: `data:image/jpeg;base64,${A.image_base64}` }} style={styles.slotImage} />
            ) : (
              <View style={[styles.slotImage, styles.slotPlaceholder]}><Text style={styles.slotPlaceholderText}>ไม่มีรูป</Text></View>
            )}
            <Text style={styles.headerName} numberOfLines={2}>{A.product_name}</Text>
          </>
        ) : (
          <View style={[styles.slotImage, styles.slotDotted]}><Text style={styles.slotPlaceholderText}>เลือกรุ่นที่ 1</Text></View>
        )}
      </View>

      {/* คอลัมน์รูป B */}
      <View style={styles.headerCell}>
        {B ? (
          <>
            {B.image_base64 ? (
              <Image source={{ uri: `data:image/jpeg;base64,${B.image_base64}` }} style={styles.slotImage} />
            ) : (
              <View style={[styles.slotImage, styles.slotPlaceholder]}><Text style={styles.slotPlaceholderText}>ไม่มีรูป</Text></View>
            )}
            <Text style={styles.headerName} numberOfLines={2}>{B.product_name}</Text>
          </>
        ) : (
          <View style={[styles.slotImage, styles.slotDotted]}><Text style={styles.slotPlaceholderText}>เลือกรุ่นที่ 2</Text></View>
        )}
      </View>
    </View>
  );
}

function SpecRow({ label, a, b, numeric }) {
  const different = !isEqualLoose(a, b);
  const numA = numeric ? extractNumber(a) : null;
  const numB = numeric ? extractNumber(b) : null;
  const max = numeric ? Math.max(numA || 0, numB || 0) || null : null;
  const winner = numeric ? betterOf(a, b) : 0;

  return (
    <View style={[styles.specRow, different ? styles.specRowDiff : null]}>
      <Text style={styles.labelCol}>{label}</Text>

      <View style={[styles.valCol, winner === -1 ? styles.winCol : null]}>
        <Text style={styles.valueText}>{a ?? '-'}</Text>
        {numeric && max ? (
          <View style={styles.meterBox}>
            <View style={[styles.meterFill, { width: meterWidth(numA, max) }]} />
          </View>
        ) : null}
      </View>

      <View style={[styles.valCol, winner === 1 ? styles.winCol : null]}>
        <Text style={styles.valueText}>{b ?? '-'}</Text>
        {numeric && max ? (
          <View style={styles.meterBox}>
            <View style={[styles.meterFill, { width: meterWidth(numB, max) }]} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function CompareScreen() {
  // ตั้งค่าเริ่มต้นเป็น 'midrange' ตามเดิม
  const [segment, setSegment] = useState('midrange');
  const [data, setData] = useState([]);
  const [picked, setPicked] = useState([]);
  const [query, setQuery] = useState('');
  const [diffOnly, setDiffOnly] = useState(false);

  const load = async () => {
    // ถ้าเลือก "แสดงทั้งหมด" ให้ดึง /products ไม่ต้องส่ง segment
    const url = segment === 'all' ? '/products' : `/products?segment=${segment}`;
    const list = await apiGet(url);
    animate(); // iOS only
    setData(list || []);
    setPicked([]);
    setQuery('');
  };

  useEffect(() => { load(); }, [segment]);

  const togglePick = (item) => {
    setPicked(prev => {
      const exists = prev.find(p => p.id === item.id);
      let next = exists ? prev.filter(p => p.id !== item.id) : [...prev, item];
      if (next.length > 2) next = next.slice(1);
      return next;
    });
    animate(); // iOS only
    Vibration.vibrate(10);
  };

  const A = picked[0];
  const B = picked[1];

  const filtered = useMemo(() => {
    if (!query) return data;
    const q = query.trim().toLowerCase();
    return data.filter(i => String(i.product_name || '').toLowerCase().includes(q));
  }, [data, query]);

  const diffCount = useMemo(() => {
    if (!A || !B) return 0;
    return SPEC_FIELDS.reduce((acc, f) => acc + (isEqualLoose(A?.spec_list?.[f.key], B?.spec_list?.[f.key]) ? 0 : 1), 0);
  }, [A, B]);

  const onClear = () => {
    animate(); // iOS only
    setPicked([]);
  };

  const rows = useMemo(() => {
    const base = SPEC_FIELDS.map(f => ({ ...f, a: A?.spec_list?.[f.key], b: B?.spec_list?.[f.key] }));
    if (!diffOnly || !A || !B) return base;
    return base.filter(r => !isEqualLoose(r.a, r.b));
  }, [A, B, diffOnly]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.title}>เปรียบเทียบสมาร์ทโฟน</Text>
          {A && B ? (
            <View style={styles.diffBadge}><Text style={styles.diffBadgeText}>แตกต่าง {diffCount} รายการ</Text></View>
          ) : null}
        </View>

        <SegmentFilter value={segment} onChange={setSegment} />

        <View style={styles.searchBox}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="ค้นหาชื่อรุ่น..."
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
          />
        </View>

        <Text style={styles.helperText}>
          {segment === 'all' ? 'เลือก 2 รุ่นจากทุกรุ่น' : 'เลือก 2 รุ่นในช่วงระดับเดียวกัน'}
        </Text>

        <FlatList
          data={filtered}
          keyExtractor={(i) => String(i.id)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardList}
          renderItem={({ item }) => (
            <ProductCard
              item={item}
              selected={picked.some(p => p.id === item.id)}
              onPress={() => togglePick(item)}
            />
          )}
          extraData={picked}
          removeClippedSubviews={false}
        />

        <View style={styles.compareBox}>
          <HeaderCells A={A} B={B} diffOnly={diffOnly} setDiffOnly={setDiffOnly} onClear={onClear} />
          {rows.map(({ key, label, a, b, numeric }) => (
            <SpecRow key={key} label={label} a={a} b={b} numeric={numeric} />
          ))}
        </View>

        <Text style={styles.tipText}>เคล็ดลับ: แตะการ์ดเพื่อเลือก/ยกเลิก • ใช้ “ต่างกันเท่านั้น” เพื่อโฟกัสจุดต่าง • “ล้าง” เพื่อตั้งค่าใหม่</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- styles ----
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f7fb' },
  container: { padding: 16, paddingBottom: 32 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  diffBadge: { backgroundColor: '#ffffffff',borderColor: '#aaaaaaff', borderWidth: 2, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  diffBadgeText: { color: '#111827', fontSize: 12, fontWeight: '700' },

  segmentRow: { flexDirection: 'row', marginBottom: 12, flexWrap: 'wrap' },
  pill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, marginRight: 8, marginBottom: 8 },
  pillActive: { backgroundColor: '#111827' },
  pillInactive: { backgroundColor: '#e5e7eb' },
  pillText: { fontSize: 14, fontWeight: '700' },
  pillTextActive: { color: '#fff' },
  pillTextInactive: { color: '#111827' },

  searchBox: { marginBottom: 6 },
  searchInput: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 14, color: '#111827' },

  helperText: { fontWeight: '700', marginTop: 10, marginBottom: 8, color: '#111827' },
  cardList: { paddingBottom: 8 },
  card: { width: CARD_WIDTH, height: CARD_HEIGHT, padding: 10, marginRight: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  cardSelected: { borderColor: '#111827', borderWidth: 2 },
  cardImage: { width: 70, height: 70, borderRadius: 10, marginBottom: 6 },
  cardImagePlaceholder: { backgroundColor: '#e5e7eb' },
  cardName: { maxWidth: 120, textAlign: 'center', fontSize: 12, color: '#111827' },
  checkDot: { position: 'absolute', top: 8, right: 8, width: 12, height: 12, borderRadius: 999, borderWidth: 1.5 },
  checkDotOn: { backgroundColor: '#10b981', borderColor: '#065f46' },
  checkDotOff: { backgroundColor: '#fff', borderColor: '#d1d5db' },

  compareBox: { marginTop: 16, padding: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#eef0f3' },

  // หัวตาราง: ซ้ายเป็นปุ่ม กลาง-ขวาเป็นรูป A/B
  compareHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  actionsColLeft: { width: 130, paddingRight: 8 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', marginBottom: 8 },
  actionBtnActive: { backgroundColor: '#111827' },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: { fontSize: 12, fontWeight: '800', color: '#111827' },
  actionBtnTextActive: { color: '#fff' },

  headerCell: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  headerName: { marginTop: 6, fontSize: 12, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  slotImage: { width: SLOT_SIZE, height: SLOT_SIZE, borderRadius: 12, marginBottom: 6 },
  slotPlaceholder: { backgroundColor: '#eef2f7', alignItems: 'center', justifyContent: 'center' },
  slotDotted: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  slotPlaceholderText: { fontSize: 10, color: '#6b7280' },

  // แถวสเปก
  specRow: { flexDirection: 'row', paddingVertical: 10, borderTopWidth: 1, borderColor: '#f1f5f9' },
  specRowDiff: { backgroundColor: '#fbfbfe' },
  labelCol: { width: 130, fontWeight: '800', color: '#0f172a' },
  valCol: { flex: 1, paddingRight: 10 },
  valueText: { color: '#0f172a' },
  winCol: { backgroundColor: '#f0fdf4' },
  meterBox: { height: 6, backgroundColor: '#eef2f7', borderRadius: 999, overflow: 'hidden', marginTop: 6 },
  meterFill: { height: '100%', backgroundColor: '#111827' },

  tipText: { fontSize: 12, color: '#6b7280', marginTop: 12 },
});
