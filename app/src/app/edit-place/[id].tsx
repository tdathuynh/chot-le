import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { categoryIcon, Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Center, Chip, Field } from '@/components/ui';
import { MaxContentWidth, Radii, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  deletePhoto,
  deletePlace,
  fetchCategories,
  fetchPlace,
  savePlace,
  setCover,
  uploadPhoto,
  type PlaceInput,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { confirmAsync, notify } from '@/lib/confirm';
import { formatDate, formatPrice, parsePrice, parseTime, shortTime } from '@/lib/format';
import { coordsFromMapsUrl, parseCoords, requestLocation } from '@/lib/location';
import { importFromMapsLink, isMapsLink } from '@/lib/maps-link';
import { AMENITIES, DISTRICTS, OCCASIONS, type Category, type Photo } from '@/lib/types';

// react-native-web tô núm công tắc màu xanh ngọc mặc định → ép về màu theme.
const WEB_SWITCH = Platform.OS === 'web' ? ({ activeThumbColor: '#FFFFFF' } as object) : {};

type DishRow = { key: string; name: string; price: string; is_signature: boolean };
type PendingPhoto = { uri: string; mimeType?: string | null };

let rowKey = 0;
const newRow = (): DishRow => ({ key: String(++rowKey), name: '', price: '', is_signature: false });

/** "31/12/2026", "1/2/26", "31-12-2026" hoặc "2026-12-31" → "2026-12-31"; sai/không có thật → null. */
function parseDateInput(s: string): string | null {
  const v = s.trim();
  let y: number, m: number, d: number;
  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const vn = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (vn) [d, m, y] = [Number(vn[1]), Number(vn[2]), Number(vn[3].length === 2 ? `20${vn[3]}` : vn[3])];
  else return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const todayIso = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

export default function EditPlace() {
  // Từ góp ý của người dùng: /edit-place/new?maps=<link Google Maps>&name=<tên quán>
  const params = useLocalSearchParams<{ id: string; maps?: string; name?: string }>();
  const id = params.id;
  const isNew = id === 'new';
  const mapsParam = isNew && typeof params.maps === 'string' ? params.maps.trim() : '';
  const nameParam = isNew && typeof params.name === 'string' ? params.name.trim() : '';
  const t = useTheme();
  const { isAdmin } = useAuth();

  const [loaded, setLoaded] = useState(isNew);
  const [categories, setCategories] = useState<Category[]>([]);

  const [name, setName] = useState(nameParam);
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [phone, setPhone] = useState('');
  const [mapsUrl, setMapsUrl] = useState(mapsParam);
  const [coordsText, setCoordsText] = useState('');
  const [locating, setLocating] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [occasions, setOccasions] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [dealTitle, setDealTitle] = useState('');
  const [dealUntil, setDealUntil] = useState('');
  const [featured, setFeatured] = useState(false);
  const [published, setPublishedState] = useState(true);
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [dishes, setDishes] = useState<DishRow[]>([newRow()]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [cover, setCoverUrl] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  // District selector modal
  const [districtModalOpen, setDistrictModalOpen] = useState(false);

  // Dán link Google Maps → tự điền tên, địa chỉ, quận, toạ độ (chỉ điền ô đang trống)
  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState('');

  async function runImport(link: string) {
    if (!isMapsLink(link)) {
      notify('Link chưa đúng', 'Hãy dán link Google Maps (vd https://maps.app.goo.gl/…).');
      return;
    }
    setImporting(true);
    setImportNote('');
    try {
      const info = await importFromMapsLink(link);
      const filled: string[] = [];
      if (info.name && !name.trim()) {
        setName(info.name);
        filled.push('tên');
      }
      if (info.address && !address.trim()) {
        setAddress(info.address);
        filled.push('địa chỉ');
      }
      if (info.district && !district) {
        setDistrict(info.district);
        filled.push(info.districtGuessed ? `khu vực (tự đoán: ${info.district}, kiểm tra lại)` : 'khu vực');
      }
      if (info.coords && !coordsText.trim()) {
        setCoordsText(`${info.coords.latitude.toFixed(6)}, ${info.coords.longitude.toFixed(6)}`);
        filled.push('toạ độ');
      }
      if (info.hours && !openTime.trim() && !closeTime.trim()) {
        setOpenTime(info.hours.open);
        setCloseTime(info.hours.close);
        filled.push(info.hours.approx ? 'giờ mở cửa (ngày/ca khác nhau, kiểm tra lại)' : 'giờ mở cửa');
      }
      if (filled.length) setImportNote(`Đã tự điền: ${filled.join(', ')}.`);
      else if (info.name || info.address || info.coords) setImportNote('Các ô đã có sẵn nội dung nên giữ nguyên.');
      else
        setImportNote(
          Platform.OS === 'web'
            ? 'Không đọc được link rút gọn trên web. Mở link trong trình duyệt rồi dán link đầy đủ trên thanh địa chỉ.'
            : 'Không đọc được thông tin từ link này, hãy nhập tay.'
        );
    } finally {
      setImporting(false);
    }
  }

  // Mở từ góp ý có kèm link → tự đọc link một lần khi vào màn hình.
  const autoImported = useRef(false);
  const autoImport = useEffectEvent((link: string) => {
    if (isMapsLink(link)) runImport(link);
  });
  useEffect(() => {
    if (!mapsParam || autoImported.current) return;
    autoImported.current = true;
    // Chạy sau khi effect xong (runImport đổi state), tránh setState đồng bộ trong effect.
    Promise.resolve().then(() => autoImport(mapsParam));
  }, [mapsParam]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
    if (isNew) return;
    fetchPlace(id).then((p) => {
      if (p) {
        setName(p.name);
        setAddress(p.address);
        setDistrict(p.district);
        // Hiện giá gọn như ngoài app (55000 → "55k"); parsePrice hiểu cả hai dạng.
        setPriceMin(formatPrice(p.price_min));
        setPriceMax(formatPrice(p.price_max));
        setOpenTime(shortTime(p.open_time));
        setCloseTime(shortTime(p.close_time));
        setPhone(p.phone ?? '');
        setMapsUrl(p.google_maps_url ?? '');
        setCoordsText(p.latitude != null && p.longitude != null ? `${p.latitude}, ${p.longitude}` : '');
        setOccasions(p.occasions ?? []);
        setAmenities(p.amenities ?? []);
        setDescription(p.description ?? '');
        setDealTitle(p.deal_title ?? '');
        setDealUntil(formatDate(p.deal_until));
        setFeatured(p.is_featured);
        setPublishedState(p.is_published);
        setCategoryIds(p.place_categories.map((c) => c.category_id));
        setDishes(
          p.dishes?.length
            ? p.dishes.map((d) => ({
                key: String(++rowKey),
                name: d.name,
                price: formatPrice(d.price),
                is_signature: d.is_signature,
              }))
            : [newRow()]
        );
        setPhotos(p.place_photos ?? []);
        setCoverUrl(p.cover_image_url);
      }
      setLoaded(true);
    });
  }, [id, isNew]);

  if (!isAdmin) {
    return (
      <ThemedView style={styles.flex}>
        <Center>
          <ThemedText>Bạn cần đăng nhập admin ở tab “Quản trị”.</ThemedText>
        </Center>
      </ThemedView>
    );
  }

  if (!loaded) {
    return (
      <ThemedView style={styles.flex}>
        <Center>
          <ThemedText themeColor="textSecondary">Đang tải thông tin quán…</ThemedText>
        </Center>
      </ThemedView>
    );
  }

  const pickPhotos = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.6,
    });
    if (res.canceled) return;
    setPending((list) => [...list, ...res.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType }))]);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return notify('Chưa cấp quyền camera');
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (res.canceled) return;
    setPending((list) => [...list, { uri: res.assets[0].uri, mimeType: res.assets[0].mimeType }]);
  };

  const removeExisting = async (photo: Photo) => {
    if (!(await confirmAsync('Xóa ảnh?', 'Ảnh sẽ bị xóa vĩnh viễn.', 'Xóa'))) return;
    try {
      await deletePhoto(photo);
      setPhotos((list) => list.filter((p) => p.id !== photo.id));
      if (cover === photo.url) {
        const next = photos.find((p) => p.id !== photo.id)?.url ?? null;
        await setCover(id, next);
        setCoverUrl(next);
      }
    } catch (e) {
      notify('Không xóa được ảnh', (e as Error).message);
    }
  };

  const makeCover = async (url: string) => {
    if (isNew) return;
    try {
      await setCover(id, url);
      setCoverUrl(url);
    } catch (e) {
      notify('Lỗi', (e as Error).message);
    }
  };

  const save = async () => {
    if (!name.trim() || !address.trim() || !district) {
      return notify('Thiếu thông tin', 'Cần nhập tên quán, địa chỉ và chọn quận/huyện.');
    }
    const ot = parseTime(openTime);
    const ct = parseTime(closeTime);
    if ((openTime && !ot) || (closeTime && !ct)) {
      return notify('Giờ không hợp lệ', 'Nhập dạng 06:00 hoặc 6h.');
    }

    // Toạ độ: ô nhập tay → nếu trống thì thử lấy từ link Google Maps dạng đầy đủ.
    const coords = coordsText.trim() ? parseCoords(coordsText) : coordsFromMapsUrl(mapsUrl);
    if (coordsText.trim() && !coords) {
      return notify('Toạ độ không hợp lệ', 'Nhập dạng 10.7769, 106.7009 hoặc dán link Google Maps có toạ độ.');
    }

    // Ưu đãi: hạn để trống = không thời hạn.
    const deal = dealTitle.trim();
    const until = dealUntil.trim() ? parseDateInput(dealUntil) : null;
    if (dealUntil.trim() && !until) {
      return notify('Hạn ưu đãi không hợp lệ', 'Nhập ngày dạng 31/12/2026, hoặc để trống nếu không có thời hạn.');
    }
    if (until && !deal) {
      return notify('Thiếu nội dung ưu đãi', 'Đã nhập hạn nhưng chưa nhập nội dung ưu đãi. Nhập nội dung hoặc xóa hạn.');
    }
    if (deal && until && until < todayIso()) {
      const ok = await confirmAsync(
        'Ưu đãi đã hết hạn',
        `Hạn ${formatDate(until)} đã qua nên ưu đãi sẽ không hiện cho người dùng. Vẫn lưu?`,
        'Vẫn lưu'
      );
      if (!ok) return;
    }

    const input: PlaceInput = {
      name: name.trim(),
      address: address.trim(),
      district,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      occasions,
      amenities,
      price_min: parsePrice(priceMin),
      price_max: parsePrice(priceMax),
      open_time: ot,
      close_time: ct,
      description: description.trim() || null,
      deal_title: deal || null,
      deal_until: deal ? until : null,
      phone: phone.trim() || null,
      google_maps_url: mapsUrl.trim() || null,
      cover_image_url: cover,
      is_featured: featured,
      is_published: published,
    };

    setSaving(true);
    try {
      setStatus('Đang lưu thông tin…');
      const placeId = await savePlace(
        isNew ? null : id,
        input,
        categoryIds,
        dishes
          .filter((d) => d.name.trim())
          .map((d, i) => ({ name: d.name.trim(), price: parsePrice(d.price), is_signature: d.is_signature, sort_order: i }))
      );

      let firstUrl = cover;
      for (let i = 0; i < pending.length; i++) {
        setStatus(`Đang tải ảnh ${i + 1}/${pending.length}…`);
        const ph = await uploadPhoto(placeId, pending[i].uri, pending[i].mimeType, photos.length + i);
        firstUrl = firstUrl ?? ph.url;
      }
      if (!cover && firstUrl) await setCover(placeId, firstUrl);

      setStatus('');
      notify('Đã lưu quán');
      router.back();
    } catch (e) {
      setStatus('');
      notify('Lưu thất bại', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (
      !(await confirmAsync('Xóa quán?', `Xóa vĩnh viễn “${name}” cùng toàn bộ ảnh và món. Không thể hoàn tác.`, 'Xóa'))
    )
      return;
    try {
      await deletePlace(id, photos);
      router.back();
    } catch (e) {
      notify('Không xóa được', (e as Error).message);
    }
  };

  const updateDish = (key: string, patch: Partial<DishRow>) =>
    setDishes((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: isNew ? 'Thêm quán mới' : 'Sửa thông tin quán' }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Card 1: Basic Information */}
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: t.card,
                borderColor: t.cardBorder,
              },
              Shadows.soft,
            ]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardHeader}>
              THÔNG TIN CƠ BẢN
            </ThemedText>
            <Field
              label="Link Google Maps"
              value={mapsUrl}
              onChangeText={(v) => {
                const pasted = v.trim().length - mapsUrl.trim().length > 10;
                setMapsUrl(v);
                if (pasted && isMapsLink(v)) runImport(v);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="https://maps.app.goo.gl/…"
              icon={<Icon name="map" size={18} themeColor="textSecondary" />}
              hint="Dán link vào là app tự điền tên, địa chỉ, khu vực và toạ độ (chỉ điền ô đang trống)."
            />
            {mapsUrl.trim() ? (
              <Button
                title={importing ? 'Đang đọc link…' : 'Tự điền lại từ link'}
                variant="tintSubtle"
                size="md"
                icon={<Icon name="sparkles" size={18} themeColor="tint" />}
                loading={importing}
                disabled={importing}
                onPress={() => runImport(mapsUrl)}
              />
            ) : null}
            {importNote ? (
              <ThemedText type="caption" themeColor="textSecondary">
                {importNote}
              </ThemedText>
            ) : null}
            <Field label="Tên quán ăn *" value={name} onChangeText={setName} placeholder="Vd: Bún bò Huế O Xuân" />
            <Field
              label="Địa chỉ chi tiết *"
              value={address}
              onChangeText={setAddress}
              placeholder="Vd: 123 Võ Văn Tần, Phường 6"
            />

            {/* Single Compact District Selector Modal Trigger */}
            <View style={styles.fieldBlock}>
              <ThemedText type="smallBold">Quận / Huyện *</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chọn Quận / Huyện"
                onPress={() => setDistrictModalOpen(true)}
                style={({ pressed }) => [
                  styles.districtPickerBtn,
                  {
                    backgroundColor: t.backgroundElement,
                    borderColor: district ? t.tint : t.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}>
                <Icon name="map-pin" size={18} themeColor="tint" />
                <ThemedText
                  type="defaultBold"
                  style={[
                    styles.districtPickerText,
                    { color: district ? t.text : t.textMuted },
                  ]}>
                  {district || 'Chạm để chọn Quận / Huyện'}
                </ThemedText>
                <Icon name="chevron-down" size={18} themeColor="textSecondary" />
              </Pressable>
            </View>
          </View>

          {/* Card 2: Categories */}
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: t.card,
                borderColor: t.cardBorder,
              },
              Shadows.soft,
            ]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardHeader}>
              DANH MỤC MÓN ĂN
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Chọn các danh mục phù hợp với quán (có thể chọn nhiều)
            </ThemedText>
            <View style={styles.chipWrap}>
              {categories.map((c) => {
                const on = categoryIds.includes(c.id);
                return (
                  <Chip
                    key={c.id}
                    label={c.name}
                    icon={<Icon name={categoryIcon(c)} size={14} themeColor={on ? 'tintText' : 'textSecondary'} />}
                    selected={on}
                    onPress={() =>
                      setCategoryIds(on ? categoryIds.filter((x) => x !== c.id) : [...categoryIds, c.id])
                    }
                  />
                );
              })}
            </View>
          </View>

          {/* Mục đích đi ăn: dùng cho bộ lọc "Đi ăn để" và tìm bằng câu nói */}
          <View style={[styles.formCard, { backgroundColor: t.card, borderColor: t.cardBorder }, Shadows.soft]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardHeader}>
              PHÙ HỢP ĐỂ
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Người dùng lọc quán theo mục đích đi ăn (chọn nhiều được)
            </ThemedText>
            <View style={styles.chipWrap}>
              {OCCASIONS.map((o) => {
                const on = occasions.includes(o.key);
                return (
                  <Chip
                    key={o.key}
                    label={o.label}
                    selected={on}
                    icon={<Icon name={o.icon} size={14} themeColor={on ? 'tintText' : 'textSecondary'} />}
                    onPress={() => setOccasions(on ? occasions.filter((x) => x !== o.key) : [...occasions, o.key])}
                  />
                );
              })}
            </View>
          </View>

          {/* Tiện ích */}
          <View style={[styles.formCard, { backgroundColor: t.card, borderColor: t.cardBorder }, Shadows.soft]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardHeader}>
              TIỆN ÍCH
            </ThemedText>
            <View style={styles.chipWrap}>
              {AMENITIES.map((a) => {
                const on = amenities.includes(a.key);
                return (
                  <Chip
                    key={a.key}
                    label={a.label}
                    selected={on}
                    icon={<Icon name={a.icon} size={14} themeColor={on ? 'tintText' : 'textSecondary'} />}
                    onPress={() => setAmenities(on ? amenities.filter((x) => x !== a.key) : [...amenities, a.key])}
                  />
                );
              })}
            </View>
          </View>

          {/* Ưu đãi độc quyền cho khách dùng app */}
          <View style={[styles.formCard, { backgroundColor: t.card, borderColor: t.cardBorder }, Shadows.soft]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardHeader}>
              ƯU ĐÃI CHO KHÁCH DÙNG APP
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Hiện thành nhãn “Ưu đãi” trên thẻ quán và trang chi tiết; khách lọc được “Có ưu đãi”. Dùng khi chào hợp tác
              với quán. Để trống nếu quán chưa có ưu đãi.
            </ThemedText>
            <Field
              label="Nội dung ưu đãi"
              value={dealTitle}
              onChangeText={setDealTitle}
              placeholder="Vd: Giảm 10% hóa đơn khi đưa app"
              maxLength={80}
              icon={<Icon name="gift" size={18} themeColor="textSecondary" />}
            />
            <Field
              label="Hạn ưu đãi (không bắt buộc)"
              value={dealUntil}
              onChangeText={setDealUntil}
              placeholder="31/12/2026"
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
              maxLength={10}
              icon={<Icon name="hourglass" size={18} themeColor="textSecondary" />}
              hint="Ngày/tháng/năm. Qua ngày này ưu đãi tự ẩn; để trống là không thời hạn."
            />
          </View>

          {/* Card 3: Price & Operating Hours */}
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: t.card,
                borderColor: t.cardBorder,
              },
              Shadows.soft,
            ]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardHeader}>
              GIÁ & GIỜ HOẠT ĐỘNG
            </ThemedText>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Field
                  label="Giá thấp nhất"
                  value={priceMin}
                  onChangeText={setPriceMin}
                  placeholder="40k"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={styles.flex}>
                <Field
                  label="Giá cao nhất"
                  value={priceMax}
                  onChangeText={setPriceMax}
                  placeholder="80k"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Field
                  label="Giờ mở cửa"
                  value={openTime}
                  onChangeText={setOpenTime}
                  placeholder="06:00"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={styles.flex}>
                <Field
                  label="Giờ đóng cửa"
                  value={closeTime}
                  onChangeText={setCloseTime}
                  placeholder="22:00"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
          </View>

          {/* Card 4: Photos Management */}
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: t.card,
                borderColor: t.cardBorder,
              },
              Shadows.soft,
            ]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardHeader}>
              HÌNH ẢNH QUÁN ĂN
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Chạm vào ảnh đã lưu để đặt làm ảnh bìa. Bấm dấu X để xóa ảnh.
            </ThemedText>

            <View style={styles.photosGrid}>
              {photos.map((p) => {
                const isCover = cover === p.url;
                return (
                  <View key={p.id} style={styles.thumbContainer}>
                    <Pressable accessibilityRole="button" accessibilityLabel="Đặt ảnh làm ảnh bìa" style={styles.flex} onPress={() => makeCover(p.url)}>
                      <Image
                        source={{ uri: p.url }}
                        style={[
                          styles.thumbImage,
                          isCover && { borderColor: t.tint, borderWidth: 3 },
                        ]}
                      />
                    </Pressable>
                    {isCover ? (
                      <View style={[styles.coverTag, { backgroundColor: t.tint }]}>
                        <ThemedText type="captionBold" style={{ color: t.tintText, fontSize: 10 }}>
                          Ảnh bìa
                        </ThemedText>
                      </View>
                    ) : null}
                    <Pressable
                      onPress={() => removeExisting(p)}
                      accessibilityRole="button"
                    accessibilityLabel="Xóa ảnh"
                    hitSlop={9}
                    style={[styles.removePhotoBtn, { backgroundColor: t.overlay }]}>
                      <Icon name="x" size={13} color="#FFFFFF" strokeWidth={2.5} />
                    </Pressable>
                  </View>
                );
              })}

              {pending.map((p, i) => (
                <View key={p.uri} style={styles.thumbContainer}>
                  <Image source={{ uri: p.uri }} style={[styles.thumbImage, { opacity: 0.75 }]} />
                  <View style={[styles.pendingTag, { backgroundColor: t.backgroundElement }]}>
                    <ThemedText type="captionBold" style={{ color: t.textSecondary, fontSize: 10 }}>
                      Chờ lưu
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => setPending(pending.filter((_, j) => j !== i))}
                    accessibilityRole="button"
                    accessibilityLabel="Xóa ảnh"
                    hitSlop={9}
                    style={[styles.removePhotoBtn, { backgroundColor: t.overlay }]}>
                    <Icon name="x" size={13} color="#FFFFFF" strokeWidth={2.5} />
                  </Pressable>
                </View>
              ))}
            </View>

            <View style={styles.row}>
              <Button
                title="Chọn ảnh"
                icon={<Icon name="images" size={18} />}
                variant="secondary"
                size="md"
                style={styles.flex}
                onPress={pickPhotos}
              />
              {Platform.OS !== 'web' ? (
                <Button
                  title="Chụp ảnh"
                  icon={<Icon name="camera" size={18} />}
                  variant="secondary"
                  size="md"
                  style={styles.flex}
                  onPress={takePhoto}
                />
              ) : null}
            </View>
          </View>

          {/* Card 5: Menu Dishes */}
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: t.card,
                borderColor: t.cardBorder,
              },
              Shadows.soft,
            ]}>
            <View style={styles.menuCardHeader}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardHeader}>
                THỰC ĐƠN (MÓN & GIÁ)
              </ThemedText>
              <View style={styles.legend}>
                <Icon name="star" size={13} themeColor="tint" />
                <ThemedText type="caption" themeColor="textSecondary">
                  = món nên thử
                </ThemedText>
              </View>
            </View>

            {dishes.map((d, index) => (
              <View key={d.key} style={styles.dishInputRow}>
                <TextInput
                  value={d.name}
                  onChangeText={(v) => updateDish(d.key, { name: v })}
                  placeholder={`Tên món #${index + 1}`}
                  placeholderTextColor={t.textMuted}
                  style={[styles.dishNameInput, { color: t.text, borderColor: t.border, backgroundColor: t.backgroundElement }]}
                />
                <TextInput
                  value={d.price}
                  onChangeText={(v) => updateDish(d.key, { price: v })}
                  placeholder="Giá"
                  placeholderTextColor={t.textMuted}
                  keyboardType="numbers-and-punctuation"
                  style={[styles.dishPriceInput, { color: t.text, borderColor: t.border, backgroundColor: t.backgroundElement }]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Đánh dấu món nên thử"
                  accessibilityState={{ selected: d.is_signature }}
                  onPress={() => updateDish(d.key, { is_signature: !d.is_signature })}
                  hitSlop={{ top: 0, bottom: 0, left: 4, right: 4 }}
                  style={styles.starBtn}>
                  <Icon name="star" filled={d.is_signature} size={21} themeColor={d.is_signature ? 'tint' : 'textMuted'} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Xóa món"
                  onPress={() => setDishes(dishes.length > 1 ? dishes.filter((x) => x.key !== d.key) : [newRow()])}
                  hitSlop={{ top: 0, bottom: 0, left: 4, right: 4 }}
                  style={styles.deleteDishBtn}>
                  <Icon name="trash-2" size={19} themeColor="textSecondary" />
                </Pressable>
              </View>
            ))}

            <Button
              title="Thêm món"
              icon={<Icon name="plus" size={18} themeColor="tint" />}
              variant="outline"
              size="sm"
              onPress={() => setDishes([...dishes, newRow()])}
              style={{ marginTop: Spacing.one }}
            />
          </View>

          {/* Card 6: Description & Contact */}
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: t.card,
                borderColor: t.cardBorder,
              },
              Shadows.soft,
            ]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardHeader}>
              MÔ TẢ & LIÊN HỆ
            </ThemedText>
            <Field
              label="Nhận xét / Giới thiệu quán"
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Vd: Nước dùng ngọt thanh từ xương, topping phong phú, nên đi trước 8h…"
            />
            <Field
              label="Số điện thoại"
              value={phone}
              onChangeText={setPhone}
              placeholder="0901234567"
              keyboardType="phone-pad"
            />
            {/* Nâng cao: toạ độ chính xác (ẩn mặc định cho form gọn) */}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: advancedOpen }}
              onPress={() => setAdvancedOpen(!advancedOpen)}
              style={styles.advancedToggle}>
              <Icon name="locate" size={18} themeColor="textSecondary" />
              <View style={styles.flex}>
                <ThemedText type="smallBold">Vị trí chính xác (cho “Gần tôi”)</ThemedText>
                <ThemedText type="caption" themeColor={coordsText.trim() || coordsFromMapsUrl(mapsUrl) ? 'success' : 'textSecondary'}>
                  {coordsText.trim()
                    ? `Đã có toạ độ: ${coordsText.trim()}`
                    : coordsFromMapsUrl(mapsUrl)
                    ? 'Sẽ lấy toạ độ từ link Google Maps'
                    : 'Chưa có — quán sẽ không hiện khoảng cách'}
                </ThemedText>
              </View>
              <Icon name={advancedOpen ? 'chevron-up' : 'chevron-down'} size={18} themeColor="textSecondary" />
            </Pressable>
            {advancedOpen ? (
              <>
                <Field
                  label="Toạ độ (để tính khoảng cách “Gần tôi”)"
                  value={coordsText}
                  onChangeText={setCoordsText}
                  autoCapitalize="none"
                  keyboardType="numbers-and-punctuation"
                  placeholder="10.7769, 106.7009"
                  hint="Đang đứng ở quán thì bấm nút bên dưới. Hoặc dán link Google Maps đầy đủ (có @vĩ độ,kinh độ)."
                />
                <Button
                  title={locating ? 'Đang lấy vị trí…' : 'Dùng vị trí hiện tại của tôi'}
                  variant="secondary"
                  size="md"
                  icon={<Icon name="locate-fixed" size={18} />}
                  disabled={locating}
                  onPress={async () => {
                    setLocating(true);
                    const c = await requestLocation();
                    setLocating(false);
                    if (c) setCoordsText(`${c.latitude.toFixed(6)}, ${c.longitude.toFixed(6)}`);
                    else notify('Chưa lấy được vị trí', 'Hãy cho phép quyền vị trí rồi thử lại.');
                  }}
                />
              </>
            ) : null}
          </View>

          {/* Card 7: Visibility Settings */}
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: t.card,
                borderColor: t.cardBorder,
              },
              Shadows.soft,
            ]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardHeader}>
              TRẠNG THÁI HIỂN THỊ
            </ThemedText>
            <View style={styles.switchRow}>
              <View style={styles.flex}>
                <ThemedText type="defaultBold">Quán tuyển chọn</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  Xuất hiện ở mục nổi bật trang chủ
                </ThemedText>
              </View>
              <Switch value={featured} onValueChange={setFeatured} trackColor={{ true: t.tint, false: t.border }} thumbColor={t.card} {...WEB_SWITCH} />
            </View>

            <View style={[styles.switchRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}>
              <View style={styles.flex}>
                <ThemedText type="defaultBold">Hiển thị cho người dùng</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  Bật để người dùng có thể tìm thấy quán này
                </ThemedText>
              </View>
              <Switch value={published} onValueChange={setPublishedState} trackColor={{ true: t.tint, false: t.border }} thumbColor={t.card} {...WEB_SWITCH} />
            </View>
          </View>

          {!isNew ? (
            <Button title="Xóa quán này" variant="danger" size="md" onPress={remove} disabled={saving} />
          ) : null}
        </ScrollView>

        {/* Thanh lưu cố định ở đáy: luôn nhìn thấy, không phải cuộn */}
        <View style={[styles.saveBar, { backgroundColor: t.card, borderTopColor: t.border }]}>
          {status ? (
            <ThemedText type="caption" themeColor="textSecondary" style={{ textAlign: 'center' }}>
              {status}
            </ThemedText>
          ) : null}
          <Button
            title={isNew ? 'Thêm quán' : 'Lưu thay đổi'}
            variant="primary"
            size="lg"
            onPress={save}
            loading={saving}
            style={styles.saveBtn}
          />
        </View>
      </KeyboardAvoidingView>

      {/* District Selector Modal */}
      <Modal
        visible={districtModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDistrictModalOpen(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: t.overlay }]}>
          <Pressable style={styles.modalDismiss} onPress={() => setDistrictModalOpen(false)} />
          <View
            style={[
              styles.districtModalSheet,
              {
                backgroundColor: t.card,
                borderColor: t.cardBorder,
              },
              Shadows.strong,
            ]}>
            <View style={styles.modalHandleWrap}>
              <View style={[styles.modalHandle, { backgroundColor: t.border }]} />
            </View>

            <View style={[styles.modalHeader, { borderBottomColor: t.border }]}>
              <ThemedText type="subtitle">Chọn Quận / Huyện</ThemedText>
              <Pressable
                onPress={() => setDistrictModalOpen(false)}
                hitSlop={12}
                style={[styles.modalCloseBtn, { backgroundColor: t.backgroundElement }]}>
                <Icon name="x" size={16} color={t.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.districtScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.districtGrid}>
                {DISTRICTS.map((d) => {
                  const isSelected = district === d;
                  return (
                    <Pressable
                      key={d}
                      accessibilityRole="button"
                      onPress={() => {
                        setDistrict(d);
                        setDistrictModalOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.districtGridItem,
                        {
                          backgroundColor: isSelected ? t.tint : t.backgroundElement,
                          borderColor: isSelected ? t.tint : t.border,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={{ color: isSelected ? t.tintText : t.text, textAlign: 'center' }}>
                        {d}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    padding: Spacing.three,
    gap: Spacing.four,
    paddingBottom: Spacing.six * 2,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  formCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.three + 2,
    gap: Spacing.three,
  },
  cardHeader: {
    letterSpacing: 0.8,
  },
  fieldBlock: {
    gap: Spacing.one + 2,
  },
  districtPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    minHeight: 48,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.two,
  },
  districtPickerText: {
    flex: 1,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  thumbContainer: {
    position: 'relative',
    width: 96,
    height: 96,
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radii.md,
  },
  coverTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 2,
    alignItems: 'center',
  },
  pendingTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 2,
    alignItems: 'center',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCardHeader: {
    flexWrap: 'wrap',
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dishInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dishNameInput: {
    ...Platform.select({ web: { outlineWidth: 0 } }),
    minWidth: 0,
    flex: 1,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    minHeight: 44,
    fontSize: 15,
  },
  dishPriceInput: {
    ...Platform.select({ web: { outlineWidth: 0 } }),
    width: 76,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: 10,
    minHeight: 44,
    fontSize: 15,
  },
  advancedToggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 48 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  starBtn: {
    width: 34,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteDishBtn: {
    width: 34,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  saveBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two + 4,
    paddingBottom: Spacing.three,
    gap: Spacing.one,
  },
  saveBtn: { width: '100%', maxWidth: MaxContentWidth - Spacing.three * 2, alignSelf: 'center' },

  /* Modal District Picker */
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    flex: 1,
  },
  districtModalSheet: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '80%',
  },
  modalHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  modalHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  districtScroll: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  districtGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  districtGridItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radii.md,
    borderWidth: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
