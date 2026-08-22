import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, fmtUsd } from '../constants/theme';
import { COLUMN2_COUNTRIES, COUNTRIES, Country } from '../data/countries';
import { calculate } from '../engine/engine';
import { getBaseRate, searchHts, describeCode, formatHts } from '../engine/htsDb';
import { CalcResult, Transport } from '../engine/types';

export interface CalcSummary {
  input: {
    code: string;
    country: string;
    entryDate: string;
    valueUsd: number;
    units?: Record<string, number>;
    transport: Transport;
  };
  result: CalcResult;
  description: string;
}

interface Props {
  onCalculated: (summary: CalcSummary) => void;
}

const TRANSPORTS: { value: Transport; label: string }[] = [
  { value: 'OCEAN', label: 'Ocean' },
  { value: 'AIR', label: 'Air' },
  { value: 'RAIL', label: 'Rail' },
];

function today(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function CalculatorScreen({ onCalculated }: Props) {
  const [query, setQuery] = useState('');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [selectedDesc, setSelectedDesc] = useState('');
  const [country, setCountry] = useState<Country | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [entryDate, setEntryDate] = useState(today());
  const [valueText, setValueText] = useState('');
  const [qtyText, setQtyText] = useState('');
  const [transport, setTransport] = useState<Transport>('OCEAN');

  const results = useMemo(() => searchHts(query, 15), [query]);

  const baseRate = useMemo(
    () => (selectedCode ? getBaseRate(selectedCode) : null),
    [selectedCode],
  );

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q);
  }, [countryQuery]);

  const pickProduct = (code: string) => {
    setSelectedCode(code);
    setSelectedDesc(describeCode(code));
    setQuery(formatHts(code));
  };

  const pickCountry = (c: Country) => {
    setCountry(c);
    setCountryOpen(false);
    setCountryQuery('');
  };

  const onCalculate = () => {
    if (!selectedCode) {
      Alert.alert('Select a product', 'Search and pick an HTS code first.');
      return;
    }
    if (!country) {
      Alert.alert('Select a country', 'Choose the country of origin.');
      return;
    }
    if (COLUMN2_COUNTRIES.includes(country.code)) {
      Alert.alert(
        'Country not supported',
        `${country.name} is a Column 2 country. This calculator does not support Column 2 duty rates.`,
      );
      return;
    }
    const valueUsd = parseFloat(valueText);
    if (!valueUsd || valueUsd <= 0) {
      Alert.alert('Enter a value', 'Shipment value must be a positive number.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      Alert.alert('Check the date', 'Entry date must be in YYYY-MM-DD format.');
      return;
    }
    let units: Record<string, number> | undefined;
    if (baseRate?.unit) {
      const qty = parseFloat(qtyText);
      if (!qty || qty <= 0) {
        Alert.alert('Enter a quantity', `Quantity in ${baseRate.unit} is required for this product.`);
        return;
      }
      units = { [baseRate.unit]: qty };
    }
    try {
      const result = calculate({
        code: selectedCode,
        country: country.code,
        entryDate,
        valueUsd,
        units,
        transport,
      });
      onCalculated({
        input: {
          code: selectedCode,
          country: country.code,
          entryDate,
          valueUsd,
          units,
          transport,
        },
        result,
        description: selectedDesc,
      });
    } catch (e) {
      Alert.alert('Could not calculate', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Trade Tariff Calculator</Text>
        <Text style={styles.subtitle}>
          Estimate US import duties, fees and landed cost from HTS code and country of origin.
        </Text>

        {/* Product search */}
        <Text style={styles.label}>Product or HTS code</Text>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search: aluminum, mango, 7601.10.60.90…"
          placeholderTextColor={C.sub}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {!selectedCode && query.length >= 2 && results.length > 0 && (
          <View style={styles.searchResults}>
            {results.map(r => (
              <Pressable key={r.code} style={styles.searchRow} onPress={() => pickProduct(r.code)}>
                <Text style={styles.searchCode}>{formatHts(r.code)}</Text>
                <Text style={styles.searchDesc} numberOfLines={2}>
                  {r.description}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        {selectedCode && (
          <View style={styles.selectedCard}>
            <Text style={styles.selectedCode}>{formatHts(selectedCode)}</Text>
            <Text style={styles.selectedDesc} numberOfLines={3}>
              {selectedDesc}
            </Text>
            <Text style={styles.selectedRate}>
              Base duty: {baseRate?.raw || 'n/a'}
              {baseRate?.unit ? ` · quantity in ${baseRate.unit}` : ''}
            </Text>
            <Pressable onPress={() => { setSelectedCode(null); setSelectedDesc(''); setQtyText(''); }}>
              <Text style={styles.changeLink}>Change product</Text>
            </Pressable>
          </View>
        )}

        {/* Country */}
        <Text style={styles.label}>Country of origin</Text>
        <Pressable style={styles.input} onPress={() => setCountryOpen(true)}>
          <Text style={country ? styles.inputText : styles.placeholder}>
            {country ? `${country.name} (${country.code})` : 'Select a country…'}
          </Text>
        </Pressable>

        {/* Entry date */}
        <Text style={styles.label}>Entry date</Text>
        <TextInput
          style={styles.input}
          value={entryDate}
          onChangeText={setEntryDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={C.sub}
          autoCapitalize="none"
        />

        {/* Value */}
        <Text style={styles.label}>Shipment value (USD)</Text>
        <TextInput
          style={styles.input}
          value={valueText}
          onChangeText={setValueText}
          placeholder="100000"
          placeholderTextColor={C.sub}
          keyboardType="numeric"
        />

        {/* Quantity for specific-duty products */}
        {baseRate?.unit && (
          <>
            <Text style={styles.label}>Quantity ({baseRate.unit})</Text>
            <TextInput
              style={styles.input}
              value={qtyText}
              onChangeText={setQtyText}
              placeholder="e.g. 5566"
              placeholderTextColor={C.sub}
              keyboardType="numeric"
            />
          </>
        )}

        {/* Transport */}
        <Text style={styles.label}>Mode of transport</Text>
        <View style={styles.segmentRow}>
          {TRANSPORTS.map(t => (
            <Pressable
              key={t.value}
              style={[styles.segment, transport === t.value && styles.segmentActive]}
              onPress={() => setTransport(t.value)}
            >
              <Text style={[styles.segmentText, transport === t.value && styles.segmentTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>Harbor maintenance fee applies to ocean freight.</Text>

        <Pressable style={styles.calcButton} onPress={onCalculate}>
          <Text style={styles.calcButtonText}>Calculate duties</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          Estimates only — not legal, tax or customs advice. Verify with your customs broker or CBP.
          Not affiliated with any government agency.
        </Text>
      </ScrollView>

      {/* Country picker modal */}
      <Modal visible={countryOpen} animationType="slide" onRequestClose={() => setCountryOpen(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Country of origin</Text>
            <Pressable onPress={() => setCountryOpen(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </Pressable>
          </View>
          <TextInput
            style={[styles.input, styles.modalSearch]}
            value={countryQuery}
            onChangeText={setCountryQuery}
            placeholder="Search country…"
            placeholderTextColor={C.sub}
            autoCapitalize="none"
          />
          <FlatList
            data={filteredCountries}
            keyExtractor={c => c.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable style={styles.countryRow} onPress={() => pickCountry(item)}>
                <Text style={styles.countryCode}>{item.code}</Text>
                <Text style={styles.countryName}>{item.name}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: C.navy },
  subtitle: { fontSize: 14, color: C.sub, marginTop: 4, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: C.navy, marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
    justifyContent: 'center',
  },
  inputText: { fontSize: 15, color: C.text },
  placeholder: { fontSize: 15, color: C.sub },
  searchResults: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  searchRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  searchCode: { fontSize: 13, fontWeight: '700', color: C.blue },
  searchDesc: { fontSize: 13, color: C.text, marginTop: 2 },
  selectedCard: {
    backgroundColor: '#EAF1FB',
    borderWidth: 1,
    borderColor: C.blueLight,
    borderRadius: 10,
    padding: 14,
    marginTop: 4,
  },
  selectedCode: { fontSize: 15, fontWeight: '800', color: C.navy },
  selectedDesc: { fontSize: 13, color: C.text, marginTop: 4 },
  selectedRate: { fontSize: 13, color: C.blue, marginTop: 6, fontWeight: '600' },
  changeLink: { fontSize: 13, color: C.blue, marginTop: 8, fontWeight: '600' },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: C.navy, borderColor: C.navy },
  segmentText: { fontSize: 14, fontWeight: '600', color: C.sub },
  segmentTextActive: { color: '#FFFFFF' },
  hint: { fontSize: 12, color: C.sub, marginTop: 6 },
  calcButton: {
    backgroundColor: C.blue,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  calcButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  disclaimer: { fontSize: 11, color: C.sub, textAlign: 'center', marginTop: 16, lineHeight: 16 },
  modalSafe: { flex: 1, backgroundColor: C.bg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.navy },
  modalClose: { fontSize: 15, fontWeight: '700', color: C.blue },
  modalSearch: { marginHorizontal: 20, marginBottom: 8 },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  countryCode: { fontSize: 13, fontWeight: '800', color: C.blue, width: 44 },
  countryName: { fontSize: 15, color: C.text },
});
