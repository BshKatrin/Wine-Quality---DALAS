import base64
import zlib

encoded = "eJwFwUEKgCAUBcDbvGUYEbR5u3YdISLsayFlikrl7ZvxiV0zwLubvYLXHzulIJXmhHCcJkS2OHY-Ojlb9IWQDI3NgrBVbjaXNTo5M94yL2x_97kaig="
encoded = "=eJzLLbI1VMvNzLM1UMtNrLA1NTBQS660TStSS7Z1DQ1SKwDKpqfZliUWZaaWJOao5Rel2KakFier5SdV2ialFpfEF2QmZxerlZdExwKVJlcWA2mgbjAJAHr4Hz8="
encoded = "eJzLLbI1VMvNzLM1UMtNrLA1NTBQS660TStSS7Z1DQ1SKwDKpqfZliUWZaaWJOao5Rel2KakFier5SdV2ialFpfEF2QmZxerlZdExwKVJlcWA2mgbjAJAHr4Hz8="
encoded = "eJwdirEOgCAQxf7mzWDieIuzk6sxBg40RFFzEJW_l7i0QxuFNGI4SCGal3TTKnAhK2Dqhh5XzetCt5Hgs9lxiiPnE-O09fIpz1fgLeHJ41RXLql6Efz8AIs0H2I="
encoded = "eJzLLbI11rNQy83MszU0UMtNrLA1N1BLrrQtLVZLtg0NdlErsDVUS0-zLUssykwtScxRyy9KsU1JLU5Wy0-qtE1KLS6JL8hMzi5WKy-JjgUqTa4sBtJA3cW2zo5qYCYASJwhNA=="
encoded ="eJwNyssNgCAQRdFuZg0FvJ0dGFfGGBjQEEUIgx-6l7s9NxZoiuGComg-aNUjbriFGNM4UO6-b3hMCb6ak1JxcF6Ykm2wXuqaAx9Cb52XvgrY_HfNHBA="
# Base64 decode (URL-safe)
decoded = base64.urlsafe_b64decode(encoded + '==')

try:
    decompressed = zlib.decompress(decoded)
    print(decompressed)
except Exception as e:
    print("Not compressed or decompression failed:", e)
    print(decoded)
    
