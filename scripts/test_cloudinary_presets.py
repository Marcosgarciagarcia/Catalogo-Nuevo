"""
Probar diferentes nombres de preset para encontrar el correcto
"""

import requests

CLOUDINARY_CLOUD_NAME = "dxvl3o4vq"

# Intentar con diferentes nombres de preset comunes
presets_to_try = [
    "books_unsigned",
    "ml_default",
    "unsigned",
    "books",
    "default",
    "books_preset"
]

def test_preset(preset_name):
    """Probar un preset específico"""
    print(f"\n🔍 Probando preset: '{preset_name}'")
    
    image_path = "default_book_cover_elegant.png"
    url = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/upload"
    
    try:
        with open(image_path, 'rb') as f:
            files = {'file': f}
            data = {
                'upload_preset': preset_name,
                'public_id': 'test_upload'
            }
            
            response = requests.post(url, files=files, data=data, timeout=10)
        
        if response.status_code == 200:
            print(f"   ✓ ¡ÉXITO! El preset '{preset_name}' funciona")
            result = response.json()
            print(f"   URL: {result['secure_url']}")
            return preset_name
        else:
            print(f"   ✗ Error {response.status_code}: {response.text[:100]}")
            return None
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
        return None

def main():
    print("=" * 60)
    print("PROBAR PRESETS DE CLOUDINARY")
    print("=" * 60)
    
    working_preset = None
    
    for preset in presets_to_try:
        result = test_preset(preset)
        if result:
            working_preset = result
            break
    
    print("\n" + "=" * 60)
    if working_preset:
        print(f"✓ Preset funcional encontrado: '{working_preset}'")
        print("\nActualiza el script con este preset:")
        print(f"   CLOUDINARY_UPLOAD_PRESET = '{working_preset}'")
    else:
        print("✗ Ningún preset funcionó")
        print("\nPor favor:")
        print("1. Ve a Cloudinary Dashboard")
        print("2. Settings → Upload → Upload presets")
        print("3. Verifica el nombre exacto del preset unsigned")
        print("4. O crea uno nuevo con:")
        print("   - Signing Mode: Unsigned")
        print("   - Nombre: books_unsigned")

if __name__ == "__main__":
    main()
