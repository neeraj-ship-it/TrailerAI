export interface CreateTranscodingTaskRequestDTO {
  // extra_options: {
  // inputs: {
  //   audio_selector: [
  //     {
  //       selector_name: string;
  //       source_type: string;
  //       tracks: number[];
  //     },
  //   ];
  // };
  // output_groups: [
  //   {
  //     outputs: {
  //       audio_description: [
  //         {
  //           bitrate: number;
  //           channels: number;
  //           codec: string;
  //           group_id: string;
  //           language_code_control: string;
  //           sample_rate: string;
  //           selector_name: string;
  //         },
  //       ];
  //     };
  //   },
  // ];
  // };
  input: string;
  output: string;
  storage_id: string;
  template_name: string;
}

export interface CreateTranscodingTaskResponseDTO {
  code: number;
  data: {
    task_id: string;
  };
  msg: string;
  request_id: string;
}

export interface GetTranscodingTaskDetailsResponseDTO {
  code: number;
  data: {
    task_id: string;
    input: string;
    output: string;
    template_name: string;
    storage_id: string;
    region: string;
    created_time: number;
    started_time: number;
    finished_time: number;
    status: string;
    duration: number;
    source_bitrate: number;
    source_size: number;
    source_resolution: string;
    source_framerate: number;
    output_size: number;
    output_resolution: string;
    output_framerate: number;
    output_bitrate: number;
    message: string;
    progress: number;
    output_groups: {
      custom_name: string;
      format: string;
      seg_type: string;
      seg_time: number;
      output: string;
    }[];
  };
  msg: string;
  request_id: string;
}
