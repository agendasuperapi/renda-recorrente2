-- Insert default gradient configuration for coupon card section
INSERT INTO landing_block_gradients (block_name, color_start, color_end, intensity_start, intensity_end, gradient_start_position, text_color, heading_color, text_color_light, text_color_dark, heading_color_light, heading_color_dark)
VALUES 
  ('cupom-card', '#00bf63', '#00bf63', 5, 15, 0, '#000000', '#000000', '#000000', '#ffffff', '#000000', '#ffffff')
ON CONFLICT (block_name) DO NOTHING;
