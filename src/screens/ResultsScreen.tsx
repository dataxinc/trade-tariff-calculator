import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, fmtUsd } from '../constants/theme';
import { COUNTRIES } from '../data/countries';
import { formatHts } from '../engine/htsDb';
import { CalcSummary } from './CalculatorScreen';

interface Props {
  summary: CalcSummary;
  onBack: () => void;
}

export default function ResultsScreen({ summary, onBack }: Props) {
  const { input, result, description } = summary;
  const countryName =
    COUNTRIES.find(c => c.code === input.country)?.name ?? input.country;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Cost breakdown</Text>
        <Text style={styles.subtitle} numberOfLines={3}>
          {formatHts(input.code)} · {description}
        </Text>
        <Text style={styles.meta}>
          {countryName} ({input.country}) · {input.entryDate} · {input.transport}
        </Text>

        {/* Summary cards */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Base cost</Text>
            <Text style={styles.summaryValue}>{fmtUsd(input.valueUsd)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total duties</Text>
            <Text style={styles.summaryValue}>{fmtUsd(result.totalDuties)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Harbor maintenance fee</Text>
            <Text style={styles.summaryValue}>{fmtUsd(result.hmf)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Merchandise processing fee</Text>
            <Text style={styles.summaryValue}>{fmtUsd(result.mpf)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.landedLabel}>Landed cost</Text>
            <Text style={styles.landedValue}>{fmtUsd(result.landedCost)}</Text>
          </View>
        </View>

        {/* Line items */}
        <Text style={styles.sectionTitle}>Line items</Text>
        <View style={styles.linesCard}>
          <LineRow
            code={result.base.code}
            rate={result.base.rateDescription}
            amount={result.base.amount}
            first
          />
          {result.surtaxLines.map((line, i) => (
            <LineRow key={`${line.code}-${i}`} code={line.code} rate={line.rateDescription} amount={line.amount} />
          ))}
        </View>

        <Text style={styles.disclaimer}>
          Estimates only — not legal, tax or customs advice. Rates reflect the official
          HTS plus presidential proclamations as of the app's data date. Always verify with
          your customs broker or CBP before importing.
        </Text>

        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>New calculation</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function LineRow({
  code,
  rate,
  amount,
  first,
}: {
  code: string;
  rate: string;
  amount: number;
  first?: boolean;
}) {
  return (
    <View style={[styles.lineRow, first && styles.lineRowFirst]}>
      <View style={styles.lineCodeCol}>
        <Text style={styles.lineCode}>{code}</Text>
        <Text style={styles.lineRate}>{rate}</Text>
      </View>
      <Text style={styles.lineAmount}>{fmtUsd(amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: C.navy },
  subtitle: { fontSize: 14, color: C.text, marginTop: 6 },
  meta: { fontSize: 12, color: C.sub, marginTop: 4 },
  summaryCard: {
    backgroundColor: C.navy,
    borderRadius: 14,
    padding: 18,
    marginTop: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: { fontSize: 14, color: '#CBD5E1' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  divider: { height: 1, backgroundColor: '#1E3A5F', marginVertical: 8 },
  landedLabel: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  landedValue: { fontSize: 16, fontWeight: '800', color: '#60A5FA' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.navy, marginTop: 20, marginBottom: 8 },
  linesCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  lineRowFirst: { borderTopWidth: 0 },
  lineCodeCol: { flex: 1, paddingRight: 12 },
  lineCode: { fontSize: 14, fontWeight: '700', color: C.text },
  lineRate: { fontSize: 12, color: C.sub, marginTop: 2 },
  lineAmount: { fontSize: 15, fontWeight: '800', color: C.navy },
  disclaimer: { fontSize: 11, color: C.sub, textAlign: 'center', marginTop: 20, lineHeight: 16 },
  backButton: {
    backgroundColor: C.navy,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  backButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
