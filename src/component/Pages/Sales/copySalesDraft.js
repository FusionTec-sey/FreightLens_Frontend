// Copy demand intent only. The normal save path revalidates every source.
export function copySalesDraft(source, newId) {
  if (source?.status !== 'DRAFT' || !source.document_key || !Number.isSafeInteger(source.version) || source.version < 1 || !Array.isArray(source.lines)) {
    throw new Error('Only a readable saved draft can be copied.');
  }
  return {
    document_key: newId(), version: 0,
    source_reference: { document_key: source.document_key, version: source.version },
    customer_key: source.customer_key,
    expected_customer_version: source.expected_customer_version,
    customer_name: source.customer_name,
    branch_id: source.branch_id, branch_name: source.branch_name,
    lines: source.lines.map(line => ({
      line_key: newId(), product_id: line.product_id,
      expected_policy_version: line.expected_policy_version,
      quantity: line.quantity, unit: line.unit,
      base_unit: line.base_unit, units: line.units,
      product_name: line.product_name, sku: line.sku,
      image_signed_url: line.image_signed_url,
    })),
  };
}
