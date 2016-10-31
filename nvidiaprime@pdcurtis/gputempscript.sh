#!/bin/sh

# optirun -b none nvidia-settings -q GPUCoreTemp -t -c :8  > /tmp/.gpuTemperature
# nvidia-settings -q GPUCoreTemp -t  > /tmp/.gpuTemperature
nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader > /tmp/.gpuTemperature
exit 0
