#!/bin/bash

# Define the list of values for the last parameter
values=(1 2 3 4 7 24)
states=(59 63 38 1878 1885 134 150 2103 327 154 892 156 158 166 169 177 192 357 204 360 209 362 217 225 1494 228 312 234 1901 370 923 241 247 269 276 278 280 45 285 289 291 293 297 299 347 366 318 323 1558 239 237)


# Loop through each value and run the Python script
for val in "${values[@]}"; do
    for state in "${states[@]}"; do 
        echo "Running with last parameter: $val and state $state"
        python collect_json_wines.py us us usd "$val" "$state"
    done
done
