import os
from sindri import Sindri
sindri = Sindri(os.getenv("SINDRI_API_KEY", ""))
print(os.getenv("SINDRI_API_KEY", ""))
# circuit_id = "4ac3da9b-ef5c-423e-9ed6-e505e2eb19a3"
circuit_id = "530bd741-af55-4c4b-9dc2-71e8b962bb43"
smart_contract_code = sindri.get_smart_contract_verifier(circuit_id)
with open("Verifier.sol", "w") as f:
    f.write(smart_contract_code)
