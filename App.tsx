import React, { useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CalculatorScreen, { CalcSummary } from './src/screens/CalculatorScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import { C } from './src/constants/theme';

function App() {
  const [summary, setSummary] = useState<CalcSummary | null>(null);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <View style={styles.root}>
        {summary ? (
          <ResultsScreen summary={summary} onBack={() => setSummary(null)} />
        ) : (
          <CalculatorScreen onCalculated={setSummary} />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default App;
