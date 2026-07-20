try {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class VolumeControl {
    [DllImport("winmm.dll")]
    public static extern int waveOutSetVolume(IntPtr hwo, uint dwVolume);

    [DllImport("winmm.dll")]
    public static extern int waveOutGetVolume(IntPtr hwo, out uint dwVolume);

    public static int GetVolume() {
        uint volume = 0;
        waveOutGetVolume(IntPtr.Zero, out volume);
        int right = (int)(volume & 0xFFFF);
        return (int)Math.Round(right / 655.35);
    }

    public static void SetVolume(int level) {
        uint vol = (uint)((level * 65535 / 100) & 0xFFFF);
        uint combined = vol | (vol << 16);
        waveOutSetVolume(IntPtr.Zero, combined);
    }
}
"@ -ErrorAction Stop

    $action = $args[0]
    switch ($action) {
        "get" {
            $vol = [VolumeControl]::GetVolume()
            Write-Output "{`"volume`":$vol,`"muted`":false}"
        }
        "set" {
            $level = [int]$args[1]
            [VolumeControl]::SetVolume($level)
            Write-Output "{`"success`":true,`"volume`":$level}"
        }
    }
} catch {
    Write-Output "{`"volume`":0,`"muted`":false,`"error`":`"$($_.Exception.Message)`"}"
}
