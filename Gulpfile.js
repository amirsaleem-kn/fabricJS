var gulp = require('gulp');
var sass = require('gulp-sass');
var notify = require('gulp-notify');

gulp.task('build-sass', function() {
    gulp.src('client/scss/index.scss')
        .pipe(sass())
        .on('error', notify.onError("Error: <%= error.message %>"))
        .pipe(gulp.dest('client/css'))
});

gulp.task('watch', ['build-sass'], function(){
    gulp.watch('client/scss/index.scss', ['build-sass']);
})

gulp.task('default', ['watch']);