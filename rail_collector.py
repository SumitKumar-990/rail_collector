#!/usr/bin/env python3
"""
rail_collector.py — Root CLI entrypoint for RailRadar train data collection.
"""

import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from data.railradar_collector import RailRadarCollector, main

if __name__ == "__main__":
    main()
