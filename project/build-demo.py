from pathlib import Path

root = Path(__file__).resolve().parent
target = Path('C:/Users/ina/.codex/visualizations/2026/09/13/01a09b98-df2d-75f1-a638-878e85b50a35/cadena-que-se-refuerza.html')
template = (root / 'demo.template.html').read_text(encoding='utf-8')
model = (root / 'network-model.js').read_text(encoding='utf-8')
assert template.count('/*__MODEL__*/') == 1
target.write_text(template.replace('/*__MODEL__*/', model), encoding='utf-8')
print(target)
