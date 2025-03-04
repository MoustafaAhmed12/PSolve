import { CommonModule } from '@angular/common';
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  EventEmitter,
  HostListener,
  inject,
  Input,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LeaderProfileService } from '../../../../pages/leader_profile/services/leader-profile.service';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import {
  ImageCroppedEvent,
  ImageCropperComponent,
  ImageTransform,
  LoadedImage,
} from 'ngx-image-cropper';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { AuthService } from '../../../../authentication/services/auth.service';

@Component({
  selector: 'app-edit-image-pop',
  standalone: true,
  imports: [FormsModule, ToastrModule, CommonModule, ImageCropperComponent],
  templateUrl: './edit-image-pop.component.html',
  styleUrl: './edit-image-pop.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class EditImagePopComponent {
  authService = inject(AuthService);
  profileService = inject(LeaderProfileService);
  toastr = inject(ToastrService);
  sanitizer = inject(DomSanitizer);
  @Input() profileImage: string = '';
  @Output() closePopup = new EventEmitter<void>();
  isUploaded: boolean = false;
  isLoading: boolean = false;
  imageChangedEvent: Event | null = null;
  croppedBlob: Blob | null = null;
  transform: ImageTransform = {
    scale: 1,
    translateH: 0,
    translateV: 0,
  };
  zoomStep = 0.1; // Zoom increment per step

  closePop() {
    this.closePopup.emit();
  }

  // Triggered when file is selected
  fileChangeEvent(event: Event): void {
    this.isUploaded = true;
    this.imageChangedEvent = event;
  }

  // Triggered after image cropping
  imageCropped(event: ImageCroppedEvent): void {
    this.croppedBlob = event.blob ?? null;
  }

  // Upload cropped image to the API
  uploadCroppedImage(): void {
    if (this.croppedBlob) {
      const formData = new FormData();
      const file = new File([this.croppedBlob], 'cropped-image.png', {
        type: 'image/png',
      });
      formData.append('ProfileImage', file, 'cropped-image.png');
      this.updateProfileImage(formData);
    } else {
      console.error('No cropped image to upload!');
    }
  }

  moveCropper(horizontal: number, vertical: number): void {
    const translateX = (this.transform.translateH ?? 0) + horizontal;
    const translateY = (this.transform.translateV ?? 0) + vertical;

    // Constrain movement within bounds
    this.transform = {
      ...this.transform,
      translateH: this.constrainValue(translateX, 'x'),
      translateV: this.constrainValue(translateY, 'y'),
    };
  }

  zoomCropper(step: number): void {
    // Limit zoom to the range [0.5, 3]
    const newScale = Math.min(
      3,
      Math.max(0.5, (this.transform.scale ?? 1) + step)
    );
    this.transform = {
      ...this.transform,
      scale: newScale,
    };
  }

  applyZoom(): void {
    this.transform = {
      ...this.transform,
      scale: Math.min(3, Math.max(0.5, this.transform.scale ?? 1)),
    };
  }

  constrainValue(value: number, axis: 'x' | 'y'): number {
    const limit = 100;
    return Math.max(-limit, Math.min(value, limit));
  }

  updateProfileImage(newImage: any) {
    this.isLoading = true;
    this.profileService.updateProfileImage(newImage).subscribe({
      next: ({ statusCode, message, errors, data }) => {
        if (statusCode === 200) {
          this.isLoading = false;
          debugger;
          this.authService.updatePhotoUrl(data);
          this.closePop();
          this.toastr.success(message);
        } else if (statusCode === 400) {
          this.toastr.error(message);
          this.isLoading = false;
        } else if (statusCode === 500) {
          this.toastr.warning(message);
          this.isLoading = false;
        } else {
          errors.forEach((error: any) => {
            this.toastr.error(error);
          });
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.log(err);
        this.isLoading = false;
      },
    });
  }

  deleteProfileImage() {
    this.isLoading = true;
    this.profileService.deleteProfileImage().subscribe({
      next: ({ statusCode, message, errors }) => {
        if (statusCode === 200) {
          this.isLoading = false;
          debugger;
          this.authService.updatePhotoUrl(null);
          this.closePop();
          this.toastr.success(message);
          window.location.reload();
        } else if (statusCode === 400) {
          this.toastr.error(message);
          this.isLoading = false;
        } else if (statusCode === 500) {
          this.toastr.warning(message);
          this.isLoading = false;
        } else {
          errors.forEach((error: any) => {
            this.toastr.error(error);
          });
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.log(err);
        this.isLoading = false;
      },
    });
  }
}
