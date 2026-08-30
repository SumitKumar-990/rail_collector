import os
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def build_weather_data(compressed_csv_path, output_path, dates, stations):
    """
    Builds weather_data.csv using temperatures extracted from compressed_data.csv.
    Columns: station_code, date, rainfall_mm, temperature_c, humidity, wind_speed
    """
    print(f"Reading temperature data from {compressed_csv_path}...")
    df_raw = pd.read_csv(compressed_csv_path, skiprows=3)
    df_raw.columns = ['time', 'temperature_2m']
    df_raw['datetime'] = pd.to_datetime(df_raw['time'], errors='coerce')
    df_raw['date_str'] = df_raw['datetime'].dt.strftime('%Y-%m-%d')
    
    daily_temps = df_raw.groupby('date_str')['temperature_2m'].mean().to_dict()
    default_mean_temp = float(df_raw['temperature_2m'].mean())
    
    np.random.seed(42)
    records = []
    for d in dates:
        date_str = d.strftime('%Y-%m-%d')
        base_temp = daily_temps.get(date_str, default_mean_temp)
        month = d.month
        
        # Winter fog escalation in Dec, Jan, Feb
        is_winter = 1 if month in [12, 1, 2] else 0
        
        for station in stations:
            st_temp = round(base_temp + np.random.uniform(-2, 2), 1)
            is_monsoon = 1 if month in [7, 8, 9, 10] else 0
            rain_prob = 0.30 if is_monsoon else (0.05 if not is_winter else 0.12)
            rainfall = round(np.random.exponential(scale=10.0) if np.random.rand() < rain_prob else 0.0, 1)
            humidity = round(np.clip(np.random.normal(85 if is_winter else 55, 10), 20, 99), 1)
            wind_speed = round(np.clip(np.random.normal(10, 4), 2, 40), 1)
            
            records.append({
                'station_code': station,
                'date': date_str,
                'rainfall_mm': rainfall,
                'temperature_c': st_temp,
                'humidity': humidity,
                'wind_speed': wind_speed
            })
            
    weather_df = pd.DataFrame(records)
    weather_df.to_csv(output_path, index=False)
    print(f"Saved weather_data.csv with shape {weather_df.shape} to {output_path}")
    return weather_df

def generate_railradar_historical(output_path, dates, stations):
    """
    Generates railradar_historical.csv representing polled live status over time.
    Columns: train_id, journey_date, station_code, next_station_code, timestamp, 
             scheduled_arrival, actual_arrival, delay_minutes, current_delay, 
             distance_remaining, scheduled_remaining_time, remaining_travel_time
    """
    print("Generating railradar_historical.csv dataset...")
    np.random.seed(42)
    
    trains = ['12301', '12302', '12951', '12952', '12004', '12626', '12424', '12260', '12926', '12627']
    
    routes = {
        '12301': ['HWH', 'GKP', 'DDU', 'PRYJ', 'CNB', 'NDLS'],
        '12302': ['NDLS', 'CNB', 'PRYJ', 'DDU', 'GKP', 'HWH'],
        '12951': ['BCT', 'ST', 'BRC', 'RTM', 'KOTA', 'NDLS'],
        '12952': ['NDLS', 'KOTA', 'RTM', 'BRC', 'ST', 'BCT'],
        '12004': ['NDLS', 'GZB', 'ALJN', 'TDL', 'CNB', 'LKO'],
        '12626': ['NDLS', 'AGC', 'VGLJ', 'BPL', 'NGP', 'MAS'],
        '12424': ['NDLS', 'CNB', 'PRYJ', 'DDU', 'PPTA', 'GHY'],
        '12260': ['NDLS', 'CNB', 'PRYJ', 'DDU', 'HWH'],
        '12926': ['BCT', 'BRC', 'RTM', 'KOTA', 'NDLS', 'ASR'],
        '12627': ['SBC', 'DMM', 'GTL', 'SC', 'NGP', 'NDLS']
    }
    
    records = []
    
    for d in dates:
        date_str = d.strftime('%Y-%m-%d')
        month = d.month
        
        # Temporal shift: winter months (Dec-Feb) have higher systemic delays (fog effect)
        winter_delay_factor = 1.6 if month in [12, 1, 2] else 1.0
        
        for train_id in trains:
            st_list = routes[train_id]
            n_stations = len(st_list)
            
            base_journey_delay = float(np.clip(np.random.exponential(scale=12 * winter_delay_factor) - 3, 0, 240))
            accumulated_delay = base_journey_delay
            
            total_dist = 1150.0
            dist_per_leg = total_dist / (n_stations - 1)
            
            journey_start_time = datetime.strptime(date_str + " 05:30:00", "%Y-%m-%d %H:%M:%S") + timedelta(minutes=int(np.random.uniform(0, 90)))
            current_time = journey_start_time
            
            for i in range(n_stations - 1):
                st_curr = st_list[i]
                st_next = st_list[i+1]
                
                # Distance remaining varies from short (<200km) to long (>600km)
                dist_rem = total_dist - (i * dist_per_leg)
                # Ensure some records fall into <200km bucket near destination
                if i == n_stations - 2:
                    dist_rem = round(np.random.uniform(50, 180), 1)
                elif i == n_stations - 3:
                    dist_rem = round(np.random.uniform(220, 550), 1)
                else:
                    dist_rem = round(dist_rem, 1)
                    
                sched_rem_time = dist_rem / 75.0 * 60.0
                
                # Section delay addition
                section_delay_add = np.random.normal(loc=4.0 * winter_delay_factor, scale=6.0)
                if np.random.rand() < (0.25 if winter_delay_factor > 1.0 else 0.12):
                    section_delay_add += np.random.uniform(15, 60)
                
                accumulated_delay = max(0.0, accumulated_delay + section_delay_add)
                
                # Remaining travel time target
                # Adding non-linear interaction with distance & weather effect
                weather_impact = (1.5 if winter_delay_factor > 1.0 else 1.0) * np.random.uniform(2, 12)
                actual_rem_time = sched_rem_time + (accumulated_delay * 0.82) + weather_impact + np.random.normal(loc=4.0, scale=8.0)
                actual_rem_time = max(8.0, actual_rem_time)
                
                sched_arr_time = current_time.strftime('%Y-%m-%d %H:%M:%S')
                act_arr_dt = current_time + timedelta(minutes=int(accumulated_delay))
                act_arr_time = act_arr_dt.strftime('%Y-%m-%d %H:%M:%S')
                
                records.append({
                    'train_id': train_id,
                    'journey_date': date_str,
                    'station_code': st_curr,
                    'next_station_code': st_next,
                    'timestamp': sched_arr_time,
                    'scheduled_arrival': sched_arr_time,
                    'actual_arrival': act_arr_time,
                    'delay_minutes': round(accumulated_delay, 1),
                    'current_delay': round(accumulated_delay, 1),
                    'distance_remaining': round(dist_rem, 1),
                    'scheduled_remaining_time': round(sched_rem_time, 1),
                    'remaining_travel_time': round(actual_rem_time, 1)
                })
                
                current_time += timedelta(minutes=int((dist_per_leg / 75.0 * 60.0) + accumulated_delay))
                
    df_hist = pd.DataFrame(records)
    df_hist.to_csv(output_path, index=False)
    print(f"Saved railradar_historical.csv with shape {df_hist.shape} to {output_path}")
    return df_hist

def generate_congestion_scores(railradar_df, output_path):
    """
    Computes congestion_scores.csv derived from train status records.
    formula: congestion_score = (delayed_trains / total_trains) * average_delay_magnitude
    Columns: route_segment, hour, day_of_week, congestion_score
    """
    print("Computing derived Estimated Congestion Scores...")
    df = railradar_df.copy()
    df['route_segment'] = df['station_code'] + '_' + df['next_station_code']
    df['dt'] = pd.to_datetime(df['timestamp'])
    df['hour'] = df['dt'].dt.hour
    df['day_of_week'] = df['dt'].dt.dayofweek
    
    df['is_delayed'] = (df['current_delay'] > 15).astype(int)
    
    grouped = df.groupby(['route_segment', 'hour', 'day_of_week']).agg(
        total_trains=('train_id', 'count'),
        delayed_trains=('is_delayed', 'sum'),
        avg_delay=('current_delay', 'mean')
    ).reset_index()
    
    grouped['congestion_score'] = (grouped['delayed_trains'] / grouped['total_trains']) * grouped['avg_delay']
    grouped['congestion_score'] = grouped['congestion_score'].round(3)
    
    res_df = grouped[['route_segment', 'hour', 'day_of_week', 'congestion_score']]
    res_df.to_csv(output_path, index=False)
    print(f"Saved congestion_scores.csv with shape {res_df.shape} to {output_path}")
    return res_df

if __name__ == '__main__':
    compressed_csv = 'compressed_data.csv'
    
    start_date = datetime(2025, 10, 1)
    dates = [start_date + timedelta(days=i) for i in range(150)]
    
    stations = ['NDLS', 'CNB', 'PRYJ', 'DDU', 'BSB', 'GKP', 'HWH', 'BCT', 'BRC', 'RTM', 
                'KOTA', 'ST', 'GZB', 'ALJN', 'TDL', 'LKO', 'AGC', 'VGLJ', 'BPL', 'NGP', 
                'MAS', 'PPTA', 'GHY', 'ASR', 'SBC', 'DMM', 'GTL', 'SC']
    
    build_weather_data(compressed_csv, 'weather_data.csv', dates, stations)
    df_rr = generate_railradar_historical('railradar_historical.csv', dates, stations)
    generate_congestion_scores(df_rr, 'congestion_scores.csv')
    print("Data preparation completed successfully!")
