/**
 * Titipin POS High-Concurrency & Anti-Overselling Stress Benchmark
 * Simulates multiple concurrent checkouts contending for limited physical inventory.
 * Validates:
 * 1. Pessimistic row-level locking (SELECT ... FOR UPDATE) integrity
 * 2. Exactly zero overselling (0 negative stock violations)
 * 3. Latency distribution (p50, p95, p99) and throughput (RPS)
 */

interface BenchmarkConfig {
  baseUrl: string;
  totalConcurrentRequests: number;
  initialStock: number;
}

const config: BenchmarkConfig = {
  baseUrl: process.env.API_URL || 'http://localhost:3001/api',
  totalConcurrentRequests: 30,
  initialStock: 5,
};

async function runBenchmark() {
  console.log('================================================================');
  console.log('⚡ TITIPIN POS CONCURRENCY & INTEGRITY BENCHMARK');
  console.log('================================================================');
  console.log(`Target Base URL:          ${config.baseUrl}`);
  console.log(`Concurrent Transactions:  ${config.totalConcurrentRequests}`);
  console.log(`Contended Product Stock:  ${config.initialStock}`);
  console.log('----------------------------------------------------------------\n');

  // Step 1: Login Admin
  const loginRes = await fetch(`${config.baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@titipin.id', password: 'Admin123!' }),
  });

  if (!loginRes.ok) {
    throw new Error(`Admin login failed: ${loginRes.status} ${loginRes.statusText}`);
  }

  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Step 2: Create a high-contention benchmark product
  const benchmarkCode = `BNCH-${Date.now().toString().slice(-6)}`;
  const createProdRes = await fetch(`${config.baseUrl}/products`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      product_code: benchmarkCode,
      product_name: `Contention Stress Item ${benchmarkCode}`,
      stock: config.initialStock,
      price: 25000,
    }),
  });

  if (!createProdRes.ok) {
    throw new Error(`Failed to create benchmark product: ${createProdRes.statusText}`);
  }

  const prodData = await createProdRes.json();
  const productId = prodData.data?.id;
  console.log(`✅ Created test benchmark product #${productId} (${benchmarkCode}) with stock = ${config.initialStock}`);

  // Step 3: Dispatch concurrent checkout requests simultaneously
  console.log(`🚀 Dispatching ${config.totalConcurrentRequests} simultaneous checkout requests...`);
  const latencies: number[] = [];
  const results = {
    success: 0,
    outOfStock: 0,
    errors: 0,
  };

  const wallStartTime = performance.now();

  const checkoutPromises = Array.from({ length: config.totalConcurrentRequests }, async (_, index) => {
    const reqStart = performance.now();
    try {
      const res = await fetch(`${config.baseUrl}/orders`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          customer_id: null, // Walk-in
          items: [{ product_id: productId, quantity: 1 }],
        }),
      });

      const reqEnd = performance.now();
      const durationMs = reqEnd - reqStart;
      latencies.push(durationMs);

      if (res.status === 201) {
        results.success++;
      } else if (res.status === 422) {
        results.outOfStock++;
      } else {
        results.errors++;
        const errText = await res.text();
        console.error(`Unexpected HTTP ${res.status}: ${errText.slice(0, 100)}`);
      }
    } catch (err: unknown) {
      results.errors++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Network error on request #${index}: ${msg}`);
    }
  });

  await Promise.all(checkoutPromises);
  const totalDurationMs = performance.now() - wallStartTime;

  // Step 4: Verify remaining stock in database
  const finalProdRes = await fetch(`${config.baseUrl}/products/${productId}`, {
    headers: authHeaders,
  });
  const finalProdData = await finalProdRes.json();
  const finalStock = finalProdData.data?.stock;

  // Step 5: Clean up benchmark product
  await fetch(`${config.baseUrl}/products/${productId}`, {
    method: 'DELETE',
    headers: authHeaders,
  });

  // Calculate statistics
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.9)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const minLatency = latencies[0] || 0;
  const maxLatency = latencies[latencies.length - 1] || 0;
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
  const rps = (config.totalConcurrentRequests / (totalDurationMs / 1000)).toFixed(1);

  console.log('\n================================================================');
  console.log('📊 EMPIRICAL BENCHMARK RESULTS');
  console.log('================================================================');
  console.log(`Total Requests Dispatched:   ${config.totalConcurrentRequests}`);
  console.log(`Successful Orders (201):     ${results.success} (Expected: exactly ${config.initialStock})`);
  console.log(`Stock Exhausted (422):       ${results.outOfStock} (Expected: exactly ${config.totalConcurrentRequests - config.initialStock})`);
  console.log(`Unexpected Errors:           ${results.errors} (Expected: 0)`);
  console.log(`Final Database Stock:        ${finalStock} (Expected: 0, strictly >= 0)`);
  console.log(`Total Elapsed Time:          ${totalDurationMs.toFixed(2)} ms`);
  console.log(`Throughput:                  ${rps} req/sec`);
  console.log('----------------------------------------------------------------');
  console.log(`Latency min:                 ${minLatency.toFixed(2)} ms`);
  console.log(`Latency avg:                 ${avgLatency.toFixed(2)} ms`);
  console.log(`Latency p50 (median):        ${p50.toFixed(2)} ms`);
  console.log(`Latency p90:                 ${p90.toFixed(2)} ms`);
  console.log(`Latency p95:                 ${p95.toFixed(2)} ms`);
  console.log(`Latency p99:                 ${p99.toFixed(2)} ms`);
  console.log(`Latency max:                 ${maxLatency.toFixed(2)} ms`);
  console.log('================================================================');

  if (results.success === config.initialStock && results.errors === 0 && finalStock === 0) {
    console.log('🎉 VERIFICATION PASSED: Zero overselling, strict atomicity verified!');
  } else {
    console.error('❌ VERIFICATION FAILED: Concurrency violation or error detected!');
    process.exit(1);
  }
}

runBenchmark().catch((err) => {
  console.error('Benchmark fatal error:', err);
  process.exit(1);
});
